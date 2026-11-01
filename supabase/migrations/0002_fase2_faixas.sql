-- Galpão Estúdio — Fase 2: faixas de áudio, mixer e alinhamento
-- Depende de 0001_fase1_projetos.sql

create table if not exists public.faixas (
  id              uuid primary key default gen_random_uuid(),
  projeto_id      uuid not null references public.projetos (id) on delete cascade,
  owner_id        uuid not null references auth.users (id) on delete cascade default auth.uid(),
  nome            text not null check (char_length(nome) between 1 and 80),
  instrumento     text not null default 'voz'
                  check (instrumento in ('voz','violao','gaita','bombo','baixo','percussao','outro')),
  ordem           double precision not null default 0,       -- posição na pilha (permite inserir acima/abaixo)
  offset_ms       integer not null default 0 check (offset_ms between -600000 and 3600000), -- alinhamento manual
  latencia_ms     integer not null default 0 check (latencia_ms between -3000 and 3000),    -- compensação do aparelho
  volume          real not null default 1 check (volume between 0 and 2),
  mudo            boolean not null default false,
  solo            boolean not null default false,
  eq_grave        real not null default 0 check (eq_grave between -15 and 15),
  eq_medio        real not null default 0 check (eq_medio between -15 and 15),
  eq_agudo        real not null default 0 check (eq_agudo between -15 and 15),
  duracao_ms      integer check (duracao_ms between 0 and 3600000),
  taxa_amostragem integer check (taxa_amostragem between 8000 and 192000),
  audio_path      text check (audio_path is null or char_length(audio_path) <= 300),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists faixas_projeto_idx on public.faixas (projeto_id, ordem);

drop trigger if exists faixas_updated_at on public.faixas;
create trigger faixas_updated_at
  before update on public.faixas
  for each row execute function public.tocar_updated_at();

alter table public.faixas enable row level security;

-- Só o dono do projeto mexe nas faixas dele. (Fase 3 acrescenta convidados.)
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

-- ---------------------------------------------------------------------------
-- Storage: bucket privado "audios". Caminho: <uid>/<projeto_id>/<arquivo>.mp3
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audios', 'audios', false, 52428800, array['audio/mpeg', 'audio/mp3'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

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
