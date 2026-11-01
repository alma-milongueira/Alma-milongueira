-- Alma Milongueira — Lista de acessos: até 10 e-mails, com um administrador
-- Depende de 0001 e 0002.
--
-- Camadas de proteção:
--   1. Hook "Before User Created": ninguém fora da lista consegue criar conta (ativar no painel, ver README).
--   2. RLS: mesmo com conta, só quem está na lista lê/grava projetos, faixas e áudios.
--   3. Limite de 10 e-mails garantido por trigger no banco.

create table if not exists public.acessos (
  email       text primary key
              check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  papel       text not null default 'membro' check (papel in ('admin', 'membro')),
  criado_em   timestamptz not null default now(),
  criado_por  uuid default auth.uid()
);

-- Administrador ("e-mail que manda")
insert into public.acessos (email, papel)
values ('luiscanabarro@hotmail.com', 'admin')
on conflict (email) do update set papel = 'admin';

-- ---------------------------------------------------------------------------
-- Funções auxiliares
-- ---------------------------------------------------------------------------
create or replace function public.email_atual()
returns text language sql stable as $$
  select lower(coalesce(auth.jwt() ->> 'email', ''))
$$;

create or replace function public.acesso_liberado()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.acessos where email = public.email_atual())
$$;

create or replace function public.eh_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.acessos where email = public.email_atual() and papel = 'admin')
$$;

-- ---------------------------------------------------------------------------
-- Limite de 10 e-mails (administrador incluído)
-- ---------------------------------------------------------------------------
create or replace function public.acessos_limite()
returns trigger language plpgsql as $$
begin
  perform pg_advisory_xact_lock(hashtext('acessos_limite'));
  if (select count(*) from public.acessos) >= 10 then
    raise exception 'Limite de 10 acessos atingido. Remova um e-mail antes de adicionar outro.'
      using errcode = 'check_violation';
  end if;
  new.email := lower(trim(new.email));
  return new;
end $$;

drop trigger if exists acessos_limite on public.acessos;
create trigger acessos_limite
  before insert on public.acessos
  for each row execute function public.acessos_limite();

-- ---------------------------------------------------------------------------
-- RLS da lista: cada um vê o próprio e-mail; o admin vê e mexe em todos (menos em admins)
-- ---------------------------------------------------------------------------
alter table public.acessos enable row level security;

drop policy if exists "acessos_select" on public.acessos;
create policy "acessos_select" on public.acessos
  for select to authenticated
  using (email = public.email_atual() or public.eh_admin());

drop policy if exists "acessos_insert_admin" on public.acessos;
create policy "acessos_insert_admin" on public.acessos
  for insert to authenticated
  with check (public.eh_admin() and papel = 'membro');

drop policy if exists "acessos_delete_admin" on public.acessos;
create policy "acessos_delete_admin" on public.acessos
  for delete to authenticated
  using (public.eh_admin() and papel = 'membro');
-- (sem policy de update: ninguém promove ninguém a admin pelo app)

-- ---------------------------------------------------------------------------
-- Projetos, faixas e áudios passam a exigir e-mail liberado
-- ---------------------------------------------------------------------------
drop policy if exists "projetos_select_dono" on public.projetos;
create policy "projetos_select_dono" on public.projetos
  for select to authenticated using (owner_id = auth.uid() and public.acesso_liberado());

drop policy if exists "projetos_insert_dono" on public.projetos;
create policy "projetos_insert_dono" on public.projetos
  for insert to authenticated with check (owner_id = auth.uid() and public.acesso_liberado());

drop policy if exists "projetos_update_dono" on public.projetos;
create policy "projetos_update_dono" on public.projetos
  for update to authenticated
  using (owner_id = auth.uid() and public.acesso_liberado())
  with check (owner_id = auth.uid() and public.acesso_liberado());

drop policy if exists "projetos_delete_dono" on public.projetos;
create policy "projetos_delete_dono" on public.projetos
  for delete to authenticated using (owner_id = auth.uid() and public.acesso_liberado());

drop policy if exists "faixas_dono" on public.faixas;
create policy "faixas_dono" on public.faixas
  for all to authenticated
  using (
    owner_id = auth.uid() and public.acesso_liberado()
    and exists (select 1 from public.projetos p where p.id = projeto_id and p.owner_id = auth.uid())
  )
  with check (
    owner_id = auth.uid() and public.acesso_liberado()
    and exists (select 1 from public.projetos p where p.id = projeto_id and p.owner_id = auth.uid())
  );

drop policy if exists "audios_dono_select" on storage.objects;
create policy "audios_dono_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'audios' and (storage.foldername(name))[1] = auth.uid()::text and public.acesso_liberado());

drop policy if exists "audios_dono_insert" on storage.objects;
create policy "audios_dono_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'audios' and (storage.foldername(name))[1] = auth.uid()::text and public.acesso_liberado());

drop policy if exists "audios_dono_update" on storage.objects;
create policy "audios_dono_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'audios' and (storage.foldername(name))[1] = auth.uid()::text and public.acesso_liberado());

drop policy if exists "audios_dono_delete" on storage.objects;
create policy "audios_dono_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'audios' and (storage.foldername(name))[1] = auth.uid()::text and public.acesso_liberado());

-- ---------------------------------------------------------------------------
-- Auth Hook "Before User Created": barra cadastro de quem não está na lista.
-- Ativar em: Authentication → Hooks → Before User Created → Postgres → public.hook_antes_de_criar_usuario
-- ---------------------------------------------------------------------------
create or replace function public.hook_antes_de_criar_usuario(event jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  e text := lower(coalesce(event -> 'user' ->> 'email', ''));
begin
  if e <> '' and exists (select 1 from public.acessos where email = e) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Este e-mail não está na lista de acessos do Alma Milongueira. Peça ao administrador para liberar.'
    )
  );
end $$;

grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_antes_de_criar_usuario(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_antes_de_criar_usuario(jsonb) from authenticated, anon, public;
grant select on public.acessos to supabase_auth_admin;
