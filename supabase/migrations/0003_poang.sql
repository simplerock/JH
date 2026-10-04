-- Poängsystem: barnens avbockningar väntar på godkännande, kan kräva foto och ger poäng per vecka.

alter table public.tasks add column requires_photo boolean not null default false;

alter table public.task_completions
  add column status text not null default 'approved' check (status in ('pending', 'approved', 'redo')),
  add column photo_path text,
  add column note text,
  add column reviewed_by uuid references public.profiles (id) on delete set null,
  add column reviewed_at timestamptz;

create index on public.task_completions (family_id, status);
create index on public.task_completions (family_id, reviewed_at);

-- Barn kan aldrig godkänna sig själva, vad appen än skickar.
create function public.completion_defaults() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_parent() then
    new.status := 'approved';
    new.reviewed_by := auth.uid();
    new.reviewed_at := now();
  else
    new.status := 'pending';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.note := null;
  end if;
  return new;
end $$;

create trigger completion_defaults before insert on public.task_completions
  for each row execute function public.completion_defaults();

create policy "förälder granskar" on public.task_completions
  for update using (family_id = public.my_family() and public.is_parent())
  with check (family_id = public.my_family() and public.is_parent());

-- Barn får bara ta bort egna som väntar eller ska göras om. Godkända ligger kvar.
drop policy "ångra avbockning" on public.task_completions;
create policy "ångra avbockning" on public.task_completions
  for delete using (
    family_id = public.my_family()
    and (public.is_parent() or (completed_by = auth.uid() and status in ('pending', 'redo')))
  );

-- Nivåer och förmåner -------------------------------------------------------------

create table public.reward_levels (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.my_family() references public.families (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  min_points int not null check (min_points >= 0),
  reward text not null,
  created_at timestamptz not null default now()
);

create index on public.reward_levels (family_id);
alter table public.reward_levels enable row level security;

create policy "familjen läser" on public.reward_levels for select using (family_id = public.my_family());
create policy "förälder skapar" on public.reward_levels for insert with check (family_id = public.my_family() and public.is_parent());
create policy "förälder ändrar" on public.reward_levels for update using (family_id = public.my_family() and public.is_parent()) with check (family_id = public.my_family());
create policy "förälder tar bort" on public.reward_levels for delete using (family_id = public.my_family() and public.is_parent());

create function public.default_reward_levels(fid uuid) returns void
language sql security definer set search_path = public as $$
  insert into public.reward_levels (family_id, name, min_points, reward) values
    (fid, 'Guld', 50, 'Väljer restaurang till lördagsmiddagen, max 600 kr'),
    (fid, 'Silver', 35, 'Väljer film och snacks på fredag'),
    (fid, 'Brons', 20, '30 minuter extra skärmtid på helgen'),
    (fid, 'Under ribban', 0, '30 minuter mindre skärmtid nästa vecka');
$$;
revoke execute on function public.default_reward_levels(uuid) from public, anon, authenticated;

do $$ begin perform public.default_reward_levels(id) from public.families; end $$;

create or replace function public.create_family(family_name text, my_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'Inte inloggad'; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'Du tillhör redan en familj';
  end if;
  insert into public.families (name) values (family_name) returning id into fid;
  insert into public.profiles (id, family_id, display_name, role) values (auth.uid(), fid, my_name, 'parent');
  perform public.default_reward_levels(fid);
  return fid;
end $$;

-- Foton som bevis ---------------------------------------------------------------
-- Privat bucket. Filer ligger under <family_id>/ och syns bara för den familjen.

insert into storage.buckets (id, name, public) values ('bevis', 'bevis', false)
  on conflict (id) do nothing;

create policy "familjen läser bevis" on storage.objects for select to authenticated
  using (bucket_id = 'bevis' and (storage.foldername(name))[1] = public.my_family()::text);
create policy "familjen laddar upp bevis" on storage.objects for insert to authenticated
  with check (bucket_id = 'bevis' and (storage.foldername(name))[1] = public.my_family()::text);
create policy "förälder tar bort bevis" on storage.objects for delete to authenticated
  using (bucket_id = 'bevis' and (storage.foldername(name))[1] = public.my_family()::text and public.is_parent());
