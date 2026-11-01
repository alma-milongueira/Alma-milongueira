-- Alma Milongueira — Fase 1: projetos (letra, cifra e ficha técnica)
-- Rode no SQL Editor do Supabase ou com `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Projetos
-- ---------------------------------------------------------------------------
create table if not exists public.projetos (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  titulo      text not null check (char_length(titulo) between 1 and 200),
  ritmo       text not null default 'milonga'
              check (ritmo in ('milonga','vaneira','chamame','rancheira','chote','xote','valsa')),
  tom         text not null default 'Em' check (tom ~ '^[A-G][#b]?m?$'),
  bpm         integer not null default 72 check (bpm between 30 and 260),
  afinacao    text not null default 'padrao' check (afinacao in ('padrao','dropD','dadgad','meioTom')),
  capo        smallint not null default 0 check (capo between 0 and 12),
  letra       jsonb not null default '[]'::jsonb check (jsonb_typeof(letra) = 'array'),
  cifra       text not null default '' check (char_length(cifra) <= 50000),
  notas       text not null default '' check (char_length(notas) <= 20000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists projetos_owner_updated_idx on public.projetos (owner_id, updated_at desc);

-- updated_at automático
create or replace function public.tocar_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists projetos_updated_at on public.projetos;
create trigger projetos_updated_at
  before update on public.projetos
  for each row execute function public.tocar_updated_at();

-- ---------------------------------------------------------------------------
-- RLS: cada um só enxerga e mexe nos próprios projetos
-- (Fase 3 acrescenta acesso de convidados por link.)
-- ---------------------------------------------------------------------------
alter table public.projetos enable row level security;

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

-- Impede trocar o dono de um projeto via update
create or replace function public.projetos_trava_dono()
returns trigger language plpgsql as $$
begin
  if new.owner_id <> old.owner_id then
    raise exception 'Não é permitido trocar o dono do projeto';
  end if;
  return new;
end $$;

drop trigger if exists projetos_trava_dono on public.projetos;
create trigger projetos_trava_dono
  before update on public.projetos
  for each row execute function public.projetos_trava_dono();
