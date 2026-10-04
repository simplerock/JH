-- Resor: flyg, hotell, program och dokument samlat på händelsen, så att alla har samma information.

alter table public.events
  add column details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  add column booked boolean not null default false,
  add column owner uuid references public.profiles (id) on delete set null,
  add column updated_at timestamptz not null default now(),
  add column updated_by uuid references public.profiles (id) on delete set null;

-- Saker att göra inför resan och barnens packuppgifter är vanliga sysslor kopplade till resan.
alter table public.tasks add column event_id uuid references public.events (id) on delete cascade;
create index on public.tasks (event_id);

create table public.event_files (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.my_family() references public.families (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  path text not null,
  name text not null,
  mime text not null,
  uploaded_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index on public.event_files (event_id);
alter table public.event_files enable row level security;

create policy "familjen läser" on public.event_files for select using (family_id = public.my_family());
create policy "förälder laddar upp" on public.event_files for insert with check (family_id = public.my_family() and public.is_parent());
create policy "förälder tar bort" on public.event_files for delete using (family_id = public.my_family() and public.is_parent());

-- Privat bucket för resedokument. Hela familjen läser, föräldrar laddar upp.
insert into storage.buckets (id, name, public) values ('resor', 'resor', false)
  on conflict (id) do nothing;

create policy "familjen läser resor" on storage.objects for select to authenticated
  using (bucket_id = 'resor' and (storage.foldername(name))[1] = public.my_family()::text);
create policy "förälder laddar upp resor" on storage.objects for insert to authenticated
  with check (bucket_id = 'resor' and (storage.foldername(name))[1] = public.my_family()::text and public.is_parent());
create policy "förälder tar bort resor" on storage.objects for delete to authenticated
  using (bucket_id = 'resor' and (storage.foldername(name))[1] = public.my_family()::text and public.is_parent());
