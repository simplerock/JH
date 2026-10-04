-- Barnen väljer själva bland lediga sysslor (sysslor utan ansvarig).
-- claimed_at visar att barnet tog sysslan själv. Bara sådana får barnet släppa igen,
-- sysslor som en förälder delat ut ligger kvar.

alter table public.tasks add column claimed_at timestamptz;

create function public.claim_task(tid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.is_parent() or public.my_family() is null then raise exception 'Bara barn väljer sysslor'; end if;
  update public.tasks set assignee = auth.uid(), claimed_at = now()
    where id = tid and family_id = public.my_family() and assignee is null and event_id is null and project_id is null;
  if not found then raise exception 'Sysslan är redan tagen'; end if;
end $$;

create function public.release_task(tid uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.tasks set assignee = null, claimed_at = null
    where id = tid and family_id = public.my_family() and assignee = auth.uid() and claimed_at is not null;
  if not found then raise exception 'Den sysslan kan du inte släppa'; end if;
end $$;

revoke execute on function public.claim_task(uuid) from public, anon;
revoke execute on function public.release_task(uuid) from public, anon;
grant execute on function public.claim_task(uuid) to authenticated;
grant execute on function public.release_task(uuid) to authenticated;
