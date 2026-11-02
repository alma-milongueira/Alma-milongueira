-- Alma Milongueira — Acesso aberto: qualquer pessoa cria conta com e-mail e senha.
-- Remove a antiga lista de acessos (10 e-mails). Pode rodar mesmo que ela nunca tenha existido.
-- Cada pessoa continua vendo e mexendo SÓ nos próprios projetos, faixas e áudios (RLS por dono).

-- 1) Se o hook "Before User Created" ainda estiver ligado no painel, passa a liberar todo mundo
--    (assim nenhum cadastro quebra). Depois dá pra desligar o hook em Authentication → Hooks.
create or replace function public.hook_antes_de_criar_usuario(event jsonb)
returns jsonb language sql as $$
  select '{}'::jsonb
$$;
grant usage on schema public to supabase_auth_admin;
grant execute on function public.hook_antes_de_criar_usuario(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_antes_de_criar_usuario(jsonb) from authenticated, anon, public;

-- 2) Regras de acesso: só o dono (sem exigir lista)
drop policy if exists "projetos_select_dono" on public.projetos;
create policy "projetos_select_dono" on public.projetos
  for select to authenticated using (owner_id = auth.uid());

drop policy if exists "projetos_insert_dono" on public.projetos;
create policy "projetos_insert_dono" on public.projetos
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists "projetos_update_dono" on public.projetos;
create policy "projetos_update_dono" on public.projetos
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "projetos_delete_dono" on public.projetos;
create policy "projetos_delete_dono" on public.projetos
  for delete to authenticated using (owner_id = auth.uid());

drop policy if exists "faixas_dono" on public.faixas;
create policy "faixas_dono" on public.faixas
  for all to authenticated
  using (
    owner_id = auth.uid()
    and exists (select 1 from public.projetos p where p.id = projeto_id and p.owner_id = auth.uid())
  )
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.projetos p where p.id = projeto_id and p.owner_id = auth.uid())
  );

drop policy if exists "audios_dono_select" on storage.objects;
create policy "audios_dono_select" on storage.objects
  for select to authenticated
  using (bucket_id = 'audios' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "audios_dono_insert" on storage.objects;
create policy "audios_dono_insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'audios' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "audios_dono_update" on storage.objects;
create policy "audios_dono_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'audios' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "audios_dono_delete" on storage.objects;
create policy "audios_dono_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'audios' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3) Some com a lista e as funções dela
drop table if exists public.acessos cascade;
drop function if exists public.acessos_limite() cascade;
drop function if exists public.eh_admin() cascade;
drop function if exists public.acesso_liberado() cascade;
drop function if exists public.email_atual() cascade;
