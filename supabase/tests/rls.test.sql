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
insert into public.budget_categories (name, monthly_limit) values ('Mat', 8000);
select tests.expect_count('select * from public.profiles', 3, 'förälder ser hela familjen');
reset role;

-- Barnet
select set_config('request.jwt.claim.sub', :'cA', false);
set role authenticated;
select tests.expect_count('select * from public.goals', 1, 'barn ser familjens mål');
select tests.expect_count('select * from public.budget_categories', 0, 'barn ser inte budget');
select tests.expect_error($$insert into public.goals (title, kind) values ('Glass', 'tasks')$$, 'barn skapar mål');
select tests.expect_count('update public.goals set current = 99999 returning 1', 0, 'barn ändrar mål');
insert into public.task_completions (task_id, period) values (:'task_child', '2026-W40');
select tests.expect_error(format($$insert into public.task_completions (task_id, period) values (%L, '2026-W40')$$, :'task_parent'), 'barn bockar av annans syssla');
select tests.expect_error($$update public.profiles set role = 'parent' where id = auth.uid()$$, 'barn gör sig till förälder');
select tests.expect_error($$update public.profiles set username = 'hack' where id = auth.uid()$$, 'barn byter användarnamn');
update public.profiles set display_name = 'Ella B' where id = auth.uid();
select tests.expect_count('delete from public.task_completions returning 1', 1, 'barn ångrar egen avbockning');
reset role;

-- Familj B ser inget från A
select set_config('request.jwt.claim.sub', :'pB', false);
set role authenticated;
select tests.expect_count('select * from public.goals', 0, 'familj B ser inte A:s mål');
select tests.expect_count('select * from public.profiles', 1, 'familj B ser bara sig själv');
select tests.expect_count('select * from public.tasks', 0, 'familj B ser inte A:s sysslor');
select tests.expect_error(format($$insert into public.tasks (family_id, title) values (%L, 'Intrång')$$, :'fam_a'), 'familj B skriver till A');
select tests.expect_error(format($$insert into public.task_completions (task_id, period) values (%L, 'x')$$, :'task_child'), 'familj B bockar av A:s syssla');
reset role;

-- Utloggad
set role anon;
select tests.expect_error($$select public.create_family('X', 'Y')$$, 'anonym skapar familj');
select tests.expect_error('select * from public.families', 'anonym läser familjer');
reset role;

\echo 'Alla RLS-tester gick igenom'
