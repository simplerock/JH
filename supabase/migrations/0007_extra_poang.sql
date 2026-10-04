-- Extra poäng: en förälder kan ge (eller dra av) poäng utöver sysslorna, med en kort motivering.
-- Räknas in i barnets vecka samma vecka som de ges.

create table public.point_adjustments (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.my_family() references public.families (id) on delete cascade,
  kid_id uuid not null references public.profiles (id) on delete cascade,
  points int not null check (points between -100 and 100 and points <> 0),
  reason text not null check (length(trim(reason)) > 0),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index on public.point_adjustments (family_id, created_at);
alter table public.point_adjustments enable row level security;
revoke all on public.point_adjustments from anon;

create policy "familjen läser" on public.point_adjustments
  for select using (family_id = public.my_family());
create policy "förälder ger poäng" on public.point_adjustments
  for insert with check (
    family_id = public.my_family()
    and public.is_parent()
    and created_by = auth.uid()
    and exists (select 1 from public.profiles p where p.id = kid_id and p.family_id = public.my_family() and p.role = 'child')
  );
create policy "förälder tar bort" on public.point_adjustments
  for delete using (family_id = public.my_family() and public.is_parent());

-- Lördagsmiddagen får kosta upp till 1200 kr.
create or replace function public.default_reward_levels(fid uuid) returns void
language sql security definer set search_path = public as $$
  insert into public.reward_levels (family_id, name, min_points, reward) values
    (fid, 'Guld', 50, 'Väljer restaurang till lördagsmiddagen, max 1200 kr'),
    (fid, 'Silver', 35, 'Väljer film och snacks på fredag'),
    (fid, 'Brons', 20, '30 minuter extra skärmtid på helgen'),
    (fid, 'Under ribban', 0, '30 minuter mindre skärmtid nästa vecka');
$$;
revoke execute on function public.default_reward_levels(uuid) from public, anon, authenticated;

update public.reward_levels set reward = 'Väljer restaurang till lördagsmiddagen, max 1200 kr'
  where reward = 'Väljer restaurang till lördagsmiddagen, max 600 kr';
