-- Home Hub: hela databasen i en fil. Klistra in i Supabase SQL Editor och tryck Run.
-- Skapad från supabase/migrations/0001-0005. Kör den bara en gång, på ett nytt projekt.

-- ===== 0001_init.sql =====
-- Familjeappen: grundschema
-- Varje rad hör till en familj. RLS ser till att man bara ser sin egen familj.
-- Föräldrar får ändra allt. Barn får läsa och bocka av sina sysslor.

create extension if not exists pgcrypto;

-- Familj och personer -------------------------------------------------------

create table public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  invite_code text not null unique default upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8)),
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid not null references public.families (id) on delete cascade,
  display_name text not null check (length(trim(display_name)) > 0),
  role text not null check (role in ('parent', 'child')),
  username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  color text not null default '#4f7cff',
  created_at timestamptz not null default now()
);

create index on public.profiles (family_id);

-- Hjälpfunktioner. security definer så att de kan läsa profiles utan att trigga RLS i loop.

create function public.my_family() returns uuid
language sql stable security definer set search_path = public as $$
  select family_id from public.profiles where id = auth.uid()
$$;

create function public.is_parent() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'parent' from public.profiles where id = auth.uid()), false)
$$;

-- Mål ------------------------------------------------------------------------

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.my_family() references public.families (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  description text,
  category text not null default 'Övrigt',
  -- tasks: progress = klara kopplade uppgifter / alla. amount: current / target.
  kind text not null check (kind in ('tasks', 'amount')),
  target numeric check (target is null or target > 0),
  current numeric not null default 0,
  unit text not null default 'kr',
  due_date date,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  check (kind <> 'amount' or target is not null)
);

create index on public.goals (family_id);

-- Projekt (renovering). UI kommer i fas 2, tabellen finns redan så uppgifter kan kopplas.

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.my_family() references public.families (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  status text not null default 'planned' check (status in ('idea', 'planned', 'ongoing', 'done')),
  budget numeric,
  spent numeric not null default 0,
  start_date date,
  end_date date,
  notes text,
  created_at timestamptz not null default now()
);

create index on public.projects (family_id);

-- Uppgifter och sysslor ----------------------------------------------------------

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.my_family() references public.families (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  area text,
  recurrence text not null default 'weekly' check (recurrence in ('none', 'daily', 'weekly', 'monthly')),
  assignee uuid references public.profiles (id) on delete set null,
  goal_id uuid references public.goals (id) on delete set null,
  project_id uuid references public.projects (id) on delete set null,
  due_date date,
  points int not null default 1 check (points >= 0),
  created_at timestamptz not null default now()
);

create index on public.tasks (family_id);
create index on public.tasks (goal_id);

-- En avbockning per uppgift och period. period = '2026-10-04', '2026-W40', '2026-10' eller 'once'.
create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.my_family() references public.families (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  period text not null,
  completed_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (task_id, period)
);

create index on public.task_completions (family_id, period);

-- Kalender och semester ----------------------------------------------------------

create table public.events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.my_family() references public.families (id) on delete cascade,
  kind text not null default 'event' check (kind in ('vacation', 'event', 'activity')),
  title text not null check (length(trim(title)) > 0),
  start_date date not null,
  end_date date,
  location text,
  notes text,
  -- [{ "text": "Pass", "done": false }]
  checklist jsonb not null default '[]'::jsonb check (jsonb_typeof(checklist) = 'array'),
  goal_id uuid references public.goals (id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_date is null or end_date >= start_date)
);

create index on public.events (family_id, start_date);

-- Budget (fas 2) ---------------------------------------------------------------

create table public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.my_family() references public.families (id) on delete cascade,
  name text not null,
  monthly_limit numeric not null default 0,
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.my_family() references public.families (id) on delete cascade,
  category_id uuid references public.budget_categories (id) on delete set null,
  amount numeric not null,
  occurred_on date not null default current_date,
  note text,
  created_at timestamptz not null default now()
);

create index on public.transactions (family_id, occurred_on);

-- Underhåll (fas 2) ------------------------------------------------------------

create table public.maintenance_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null default public.my_family() references public.families (id) on delete cascade,
  title text not null,
  interval_days int not null check (interval_days > 0),
  last_done date,
  notes text,
  created_at timestamptz not null default now()
);

-- Row Level Security -----------------------------------------------------------

alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.goals enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.task_completions enable row level security;
alter table public.events enable row level security;
alter table public.budget_categories enable row level security;
alter table public.transactions enable row level security;
alter table public.maintenance_items enable row level security;

create policy "läs egen familj" on public.families
  for select using (id = public.my_family());
create policy "förälder ändrar familj" on public.families
  for update using (id = public.my_family() and public.is_parent())
  with check (id = public.my_family());

create policy "läs familjemedlemmar" on public.profiles
  for select using (family_id = public.my_family() or id = auth.uid());
create policy "ändra egen profil" on public.profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and family_id = public.my_family()
    and role = case when public.is_parent() then 'parent' else 'child' end);
create policy "förälder ändrar familjemedlem" on public.profiles
  for update using (family_id = public.my_family() and public.is_parent())
  with check (family_id = public.my_family() and public.is_parent());
create policy "förälder tar bort familjemedlem" on public.profiles
  for delete using (family_id = public.my_family() and public.is_parent() and id <> auth.uid());

-- Användarnamn är kopplat till barnets inloggning och får inte ändras från appen.
revoke insert, update on public.profiles from anon, authenticated;
grant update (display_name, color, role) on public.profiles to authenticated;
revoke all on public.families from anon;
revoke insert, delete on public.families from authenticated;

-- Samma mönster för familjens delade data: alla läser, föräldrar skriver.
do $$
declare t text;
begin
  foreach t in array array['goals', 'projects', 'tasks', 'events', 'maintenance_items'] loop
    execute format('create policy "familjen läser" on public.%I for select using (family_id = public.my_family())', t);
    execute format('create policy "förälder skapar" on public.%I for insert with check (family_id = public.my_family() and public.is_parent())', t);
    execute format('create policy "förälder ändrar" on public.%I for update using (family_id = public.my_family() and public.is_parent()) with check (family_id = public.my_family())', t);
    execute format('create policy "förälder tar bort" on public.%I for delete using (family_id = public.my_family() and public.is_parent())', t);
  end loop;
end $$;

-- Pengar är bara för föräldrar.
do $$
declare t text;
begin
  foreach t in array array['budget_categories', 'transactions'] loop
    execute format('create policy "bara föräldrar" on public.%I for all using (family_id = public.my_family() and public.is_parent()) with check (family_id = public.my_family() and public.is_parent())', t);
  end loop;
end $$;

-- Avbockningar: alla i familjen ser. Man får bocka av egna eller otilldelade sysslor. Föräldrar allt.
create policy "familjen läser" on public.task_completions
  for select using (family_id = public.my_family());
create policy "bocka av" on public.task_completions
  for insert with check (
    family_id = public.my_family()
    and completed_by = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and t.family_id = public.my_family()
        and (public.is_parent() or t.assignee is null or t.assignee = auth.uid())
    )
  );
create policy "ångra avbockning" on public.task_completions
  for delete using (family_id = public.my_family() and (public.is_parent() or completed_by = auth.uid()));

-- Onboarding --------------------------------------------------------------------

create function public.create_family(family_name text, my_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'Inte inloggad'; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'Du tillhör redan en familj';
  end if;
  insert into public.families (name) values (family_name) returning id into fid;
  insert into public.profiles (id, family_id, display_name, role) values (auth.uid(), fid, my_name, 'parent');
  return fid;
end $$;

create function public.join_family(code text, my_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare fid uuid;
begin
  if auth.uid() is null then raise exception 'Inte inloggad'; end if;
  if exists (select 1 from public.profiles where id = auth.uid()) then
    raise exception 'Du tillhör redan en familj';
  end if;
  select id into fid from public.families where invite_code = upper(trim(code));
  if fid is null then raise exception 'Fel inbjudningskod'; end if;
  insert into public.profiles (id, family_id, display_name, role) values (auth.uid(), fid, my_name, 'parent');
  return fid;
end $$;

create function public.new_invite_code() returns text
language plpgsql security definer set search_path = public as $$
declare c text := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
begin
  if not public.is_parent() then raise exception 'Bara föräldrar'; end if;
  update public.families set invite_code = c where id = public.my_family();
  return c;
end $$;

revoke execute on function public.create_family(text, text) from public, anon;
revoke execute on function public.join_family(text, text) from public, anon;
revoke execute on function public.new_invite_code() from public, anon;
grant execute on function public.create_family(text, text) to authenticated;
grant execute on function public.join_family(text, text) to authenticated;
grant execute on function public.new_invite_code() to authenticated;

-- ===== 0002_ansvar.sql =====
-- Ansvarig person på mål, projekt och underhåll. Hem visar det man själv ansvarar för.
alter table public.goals add column owner uuid references public.profiles (id) on delete set null;
alter table public.projects add column owner uuid references public.profiles (id) on delete set null;
alter table public.maintenance_items add column owner uuid references public.profiles (id) on delete set null;

create index on public.tasks (project_id);

-- ===== 0003_poang.sql =====
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

-- ===== 0004_resor.sql =====
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

-- ===== 0005_kalender.sql =====
-- Hemlig länk för att prenumerera på familjens kalender i iPhone, Google eller Outlook.
alter table public.families
  add column calendar_token text not null unique default encode(gen_random_bytes(18), 'hex');

create function public.new_calendar_token() returns text
language plpgsql security definer set search_path = public as $$
declare t text := encode(gen_random_bytes(18), 'hex');
begin
  if not public.is_parent() then raise exception 'Bara föräldrar'; end if;
  update public.families set calendar_token = t where id = public.my_family();
  return t;
end $$;

revoke execute on function public.new_calendar_token() from public, anon;
grant execute on function public.new_calendar_token() to authenticated;

