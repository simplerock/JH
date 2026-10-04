-- Ansvarig person på mål, projekt och underhåll. Hem visar det man själv ansvarar för.
alter table public.goals add column owner uuid references public.profiles (id) on delete set null;
alter table public.projects add column owner uuid references public.profiles (id) on delete set null;
alter table public.maintenance_items add column owner uuid references public.profiles (id) on delete set null;

create index on public.tasks (project_id);
