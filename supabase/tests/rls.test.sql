-- RLS-tester. Körs av supabase/tests/run.sh.
\set pA '11111111-1111-1111-1111-111111111111'
\set pA2 '22222222-2222-2222-2222-222222222222'
\set cA '33333333-3333-3333-3333-333333333333'
\set pB '44444444-4444-4444-4444-444444444444'

create schema tests;
grant usage on schema tests to authenticated, anon;

create function tests.expect_error(stmt text, label text) returns void language plpgsql as $$
begin
  execute stmt;
  raise exception 'FEL: % borde ha nekats', label;
exception
  when raise_exception then
    if sqlerrm like 'FEL:%' then raise; end if;
  when insufficient_privilege or check_violation or not_null_violation then null;
end $$;

create function tests.expect_count(stmt text, expected int, label text) returns void language plpgsql as $$
declare n int;
begin
  execute 'with x as (' || stmt || ') select count(*) from x' into n;
  if n <> expected then raise exception 'FEL: % gav % rader, väntade %', label, n, expected; end if;
end $$;

grant execute on all functions in schema tests to authenticated, anon;

insert into auth.users (id) values (:'pA'), (:'pA2'), (:'cA'), (:'pB');

-- Förälder A skapar familj
select set_config('request.jwt.claim.sub', :'pA', false);
set role authenticated;
select public.create_family('Familjen A', 'Anna') as fam_a \gset
select invite_code as code_a from public.families \gset
select tests.expect_error($$select public.create_family('Igen', 'Anna')$$, 'skapa familj två gånger');
reset role;

-- Förälder 2 går med via kod
select set_config('request.jwt.claim.sub', :'pA2', false);
set role authenticated;
select tests.expect_error($$select public.join_family('FELKOD', 'Erik')$$, 'fel inbjudningskod');
select public.join_family(lower(:'code_a'), 'Erik');
reset role;

-- Barnkonto skapas av servern (service role), precis som appen gör
insert into public.profiles (id, family_id, display_name, role, username)
values (:'cA', :'fam_a', 'Ella', 'child', 'ella');

-- Familj B
select set_config('request.jwt.claim.sub', :'pB', false);
set role authenticated;
select public.create_family('Familjen B', 'Bo');
reset role;

-- Förälder A lägger in data
select set_config('request.jwt.claim.sub', :'pA', false);
set role authenticated;
insert into public.goals (title, kind, target, current) values ('Semesterkassa', 'amount', 30000, 5000);
insert into public.tasks (title, assignee) values ('Dammsuga', :'cA') returning id as task_child \gset
insert into public.tasks (title, assignee) values ('Tvätta', :'pA2') returning id as task_parent \gset
insert into public.budget_categories (name, monthly_limit) values ('Mat', 8000) returning id as cat \gset
insert into public.transactions (category_id, amount, note) values (:'cat', 450, 'ICA');
insert into public.projects (title, budget, owner) values ('Nytt badrum', 180000, :'pA2') returning id as proj \gset
insert into public.tasks (title, recurrence, project_id) values ('Kakla', 'none', :'proj');
insert into public.maintenance_items (title, interval_days, owner) values ('Byta filter', 180, :'cA');
insert into public.goals (title, kind, target, owner) values ('Cykel', 'amount', 3500, :'cA');
select tests.expect_count('select * from public.profiles', 3, 'förälder ser hela familjen');
reset role;

-- Barnet
select set_config('request.jwt.claim.sub', :'cA', false);
set role authenticated;
select tests.expect_count('select * from public.goals', 2, 'barn ser familjens mål');
select tests.expect_count('select * from public.budget_categories', 0, 'barn ser inte budget');
select tests.expect_count('select * from public.transactions', 0, 'barn ser inte utgifter');
select tests.expect_error($$insert into public.transactions (amount) values (1)$$, 'barn lägger till utgift');
select tests.expect_count('select * from public.projects', 1, 'barn ser projekt');
select tests.expect_count('select * from public.maintenance_items where owner = auth.uid()', 1, 'barn ser sitt underhåll');
select tests.expect_count('update public.maintenance_items set last_done = current_date returning 1', 0, 'barn ändrar underhåll');
select tests.expect_count('update public.projects set spent = 1 returning 1', 0, 'barn ändrar projekt');
select tests.expect_error($$insert into public.goals (title, kind) values ('Glass', 'tasks')$$, 'barn skapar mål');
select tests.expect_count('update public.goals set current = 99999 returning 1', 0, 'barn ändrar mål');
insert into public.task_completions (task_id, period) values (:'task_child', '2026-W40');
select tests.expect_error(format($$insert into public.task_completions (task_id, period) values (%L, '2026-W40')$$, :'task_parent'), 'barn bockar av annans syssla');
select tests.expect_error($$update public.profiles set role = 'parent' where id = auth.uid()$$, 'barn gör sig till förälder');
select tests.expect_error($$update public.profiles set username = 'hack' where id = auth.uid()$$, 'barn byter användarnamn');
update public.profiles set display_name = 'Ella B' where id = auth.uid();
select tests.expect_count('delete from public.task_completions returning 1', 1, 'barn ångrar egen avbockning');
reset role;

-- Poängsystemet
select set_config('request.jwt.claim.sub', :'cA', false);
set role authenticated;
insert into public.task_completions (task_id, period, status) values (:'task_child', '2026-W41', 'approved') returning id as comp \gset
select tests.expect_count($$select * from public.task_completions where period = '2026-W41' and status = 'pending'$$, 1, 'barnets avbockning väntar trots approved');
select tests.expect_count($$update public.task_completions set status = 'approved' where period = '2026-W41' returning 1$$, 0, 'barn godkänner sig själv');
select tests.expect_count('select * from public.reward_levels', 4, 'barn ser nivåerna');
select tests.expect_count($$update public.reward_levels set min_points = 1 returning 1$$, 0, 'barn ändrar nivåer');
select tests.expect_error($$insert into public.reward_levels (name, min_points, reward) values ('Fusk', 0, 'Allt')$$, 'barn skapar nivå');
insert into storage.objects (bucket_id, name) values ('bevis', :'fam_a' || '/foto1.jpg');
select tests.expect_error($$insert into storage.objects (bucket_id, name) values ('bevis', 'annan-familj/foto.jpg')$$, 'barn laddar upp i fel mapp');
reset role;

select set_config('request.jwt.claim.sub', :'pA2', false);
set role authenticated;
update public.task_completions set status = 'redo', note = 'Gör om' where period = '2026-W41';
select tests.expect_count($$select * from public.task_completions where period = '2026-W41' and status = 'redo'$$, 1, 'förälder skickar tillbaka');
insert into public.task_completions (task_id, period) values (:'task_parent', '2026-W41');
select tests.expect_count($$select * from public.task_completions where task_id = '$$ || :'task_parent' || $$' and status = 'approved'$$, 1, 'förälderns avbockning godkänns direkt');
reset role;

select set_config('request.jwt.claim.sub', :'cA', false);
set role authenticated;
select tests.expect_count($$delete from public.task_completions where period = '2026-W41' returning 1$$, 1, 'barn tar bort gör om för att skicka igen');
insert into public.task_completions (task_id, period) values (:'task_child', '2026-W41');
reset role;
select set_config('request.jwt.claim.sub', :'pA', false);
set role authenticated;
update public.task_completions set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now() where period = '2026-W41' and task_id = :'task_child';
reset role;
select set_config('request.jwt.claim.sub', :'cA', false);
set role authenticated;
select tests.expect_count($$delete from public.task_completions where period = '2026-W41' returning 1$$, 0, 'barn tar bort godkänd');
reset role;

-- Resor
select set_config('request.jwt.claim.sub', :'pA', false);
set role authenticated;
insert into public.events (kind, title, start_date, end_date, booked, owner, details)
  values ('vacation', 'Zhangjiajie', '2026-11-07', '2026-11-15', false, :'pA2', '{"flights": [{"flight_no": "MF 8656"}]}')
  returning id as trip \gset
insert into public.event_files (event_id, path, name, mime) values (:'trip', :'fam_a' || '/resa/program.pdf', 'program.pdf', 'application/pdf');
insert into storage.objects (bucket_id, name) values ('resor', :'fam_a' || '/resa/program.pdf');
insert into public.tasks (title, recurrence, assignee, event_id, points, requires_photo) values ('Packa väskan', 'none', :'cA', :'trip', 6, true);
reset role;

select set_config('request.jwt.claim.sub', :'cA', false);
set role authenticated;
select tests.expect_count($$select * from public.events where details->'flights'->0->>'flight_no' = 'MF 8656'$$, 1, 'barn ser reseinfon');
select tests.expect_count('select * from public.event_files', 1, 'barn ser dokumenten');
select tests.expect_count($$select * from storage.objects where bucket_id = 'resor'$$, 1, 'barn kan öppna dokumenten');
select tests.expect_error(format($$insert into public.event_files (event_id, path, name, mime) values (%L, 'x', 'x', 'x')$$, :'trip'), 'barn laddar upp dokument');
select tests.expect_error(format($$insert into storage.objects (bucket_id, name) values ('resor', %L)$$, :'fam_a' || '/resa/fusk.pdf'), 'barn laddar upp till resor');
select tests.expect_count('update public.events set booked = true returning 1', 0, 'barn ändrar resan');
select tests.expect_count($$select * from public.tasks where event_id is not null and assignee = auth.uid()$$, 1, 'barn ser sin packuppgift');
reset role;

-- Extra poäng
select set_config('request.jwt.claim.sub', :'pA', false);
set role authenticated;
insert into public.point_adjustments (kid_id, points, reason) values (:'cA', 5, 'Hjälpte till');
select tests.expect_error(format($$insert into public.point_adjustments (kid_id, points, reason) values (%L, 5, 'Själv')$$, :'pA'), 'förälder ger poäng till vuxen');
select tests.expect_error(format($$insert into public.point_adjustments (kid_id, points, reason) values (%L, 0, 'Noll')$$, :'cA'), 'noll poäng');
reset role;
select set_config('request.jwt.claim.sub', :'cA', false);
set role authenticated;
select tests.expect_count('select * from public.point_adjustments', 1, 'barn ser sina extra poäng');
select tests.expect_error(format($$insert into public.point_adjustments (kid_id, points, reason) values (%L, 50, 'Fusk')$$, :'cA'), 'barn ger sig själv poäng');
select tests.expect_count('delete from public.point_adjustments returning 1', 0, 'barn tar bort avdrag');
select tests.expect_count('update public.point_adjustments set points = 100 returning 1', 0, 'barn ändrar poäng');
reset role;
select set_config('request.jwt.claim.sub', :'pB', false);
set role authenticated;
select tests.expect_count('select * from public.point_adjustments', 0, 'familj B ser inte A:s extra poäng');
select tests.expect_error(format($$insert into public.point_adjustments (kid_id, points, reason) values (%L, 5, 'Intrång')$$, :'cA'), 'familj B ger A:s barn poäng');
reset role;

-- Barnen väljer lediga sysslor
select set_config('request.jwt.claim.sub', :'pA', false);
set role authenticated;
insert into public.tasks (title) values ('Ledig: tömma diskmaskinen') returning id as free_task \gset
insert into public.tasks (title, assignee) values ('Utdelad: bädda', :'cA') returning id as given_task \gset
select tests.expect_error(format($$select public.claim_task(%L)$$, :'free_task'), 'förälder väljer syssla som barn');
reset role;
select set_config('request.jwt.claim.sub', :'cA', false);
set role authenticated;
select public.claim_task(:'free_task');
select tests.expect_count(format($$select * from public.tasks where id = %L and assignee = auth.uid() and claimed_at is not null$$, :'free_task'), 1, 'barnet tog den lediga sysslan');
select tests.expect_error(format($$select public.claim_task(%L)$$, :'free_task'), 'ta samma syssla två gånger');
select tests.expect_error(format($$select public.release_task(%L)$$, :'given_task'), 'barn släpper utdelad syssla');
select public.release_task(:'free_task');
select tests.expect_count(format($$select * from public.tasks where id = %L and assignee is null$$, :'free_task'), 1, 'barnet släppte sysslan');
select tests.expect_count(format($$update public.tasks set assignee = auth.uid() where id = %L returning 1$$, :'free_task'), 0, 'barn sätter sig som ansvarig direkt');
reset role;
select set_config('request.jwt.claim.sub', :'pB', false);
set role authenticated;
select tests.expect_error(format($$select public.claim_task(%L)$$, :'free_task'), 'annan familj tar syssla');
reset role;

-- Ångra och återställa avbockningar
select set_config('request.jwt.claim.sub', :'cA', false);
set role authenticated;
insert into public.task_completions (task_id, period) values (:'task_child', '2026-W50') returning id as undo_approved \gset
insert into public.task_completions (task_id, period) values (:'task_child', '2026-W51') returning id as undo_pending \gset
select tests.expect_count(format($$delete from public.task_completions where id = %L returning 1$$, :'undo_pending'), 1, 'barn ångrar eget inskick som väntar');
insert into public.task_completions (task_id, period) values (:'task_child', '2026-W52') returning id as reset_pending \gset
reset role;
select set_config('request.jwt.claim.sub', :'pA', false);
set role authenticated;
update public.task_completions set status = 'approved' where id = :'undo_approved';
reset role;
select set_config('request.jwt.claim.sub', :'cA', false);
set role authenticated;
select tests.expect_count(format($$delete from public.task_completions where id = %L returning 1$$, :'undo_approved'), 0, 'barn tar bort godkänd avbockning');
select tests.expect_count(format($$delete from public.task_completions where task_id = %L and completed_by <> auth.uid() returning 1$$, :'task_parent'), 0, 'barn tar bort förälders avbockning');
reset role;
select set_config('request.jwt.claim.sub', :'pA', false);
set role authenticated;
select tests.expect_count(format($$delete from public.task_completions where id = %L returning 1$$, :'undo_approved'), 1, 'förälder återställer godkänd avbockning');
select tests.expect_count(format($$delete from public.task_completions where id = %L returning 1$$, :'reset_pending'), 1, 'förälder återställer inskick som väntar');
reset role;
select set_config('request.jwt.claim.sub', :'pB', false);
set role authenticated;
select tests.expect_count('delete from public.task_completions returning 1', 0, 'familj B återställer A:s avbockningar');
reset role;

-- Familj B ser inget från A
select set_config('request.jwt.claim.sub', :'pB', false);
set role authenticated;
select tests.expect_count('select * from public.goals', 0, 'familj B ser inte A:s mål');
select tests.expect_count('select * from public.profiles', 1, 'familj B ser bara sig själv');
select tests.expect_count('select * from public.tasks', 0, 'familj B ser inte A:s sysslor');
select tests.expect_count('select * from public.projects', 0, 'familj B ser inte A:s projekt');
select tests.expect_count('select * from public.maintenance_items', 0, 'familj B ser inte A:s underhåll');
select tests.expect_count('select * from public.reward_levels', 4, 'familj B ser bara sina nivåer');
select tests.expect_count('select * from storage.objects', 0, 'familj B ser inte A:s foton eller dokument');
select tests.expect_count('select * from public.event_files', 0, 'familj B ser inte A:s resedokument');
select tests.expect_count('select * from public.events', 0, 'familj B ser inte A:s resor');
select tests.expect_error(format($$insert into public.tasks (family_id, title) values (%L, 'Intrång')$$, :'fam_a'), 'familj B skriver till A');
select tests.expect_error(format($$insert into public.task_completions (task_id, period) values (%L, 'x')$$, :'task_child'), 'familj B bockar av A:s syssla');
reset role;

-- Utloggad
set role anon;
select tests.expect_error($$select public.create_family('X', 'Y')$$, 'anonym skapar familj');
select tests.expect_error('select * from public.families', 'anonym läser familjer');
reset role;

\echo 'Alla RLS-tester gick igenom'
