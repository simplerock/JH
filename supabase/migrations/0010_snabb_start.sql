-- Snabbare start: familjens data i en enda fråga.
-- Tidigare hämtade varje sida 9 till 11 tabeller var för sig. Efter en stunds vila måste databasen då
-- öppna lika många nya anslutningar samtidigt, vilket tog 300 till 600 ms. En funktion gör samma jobb i ett anrop.
-- security invoker: RLS gäller precis som när tabellerna läses direkt.

create function public.family_data(
  periods text[],
  reviewed_since timestamptz,
  completed_since timestamptz,
  events_from date default null
) returns json
language sql stable security invoker set search_path = public as $$
  select json_build_object(
    'members', (select coalesce(json_agg(p order by p.created_at), '[]') from public.profiles p),
    'goals', (select coalesce(json_agg(g order by g.created_at), '[]') from public.goals g),
    'tasks', (select coalesce(json_agg(t order by t.created_at), '[]') from public.tasks t),
    -- Aktuella perioder, allt som väntar, två veckors godkända (poäng) och 60 dagar bakåt (streaks).
    'completions', (
      select coalesce(json_agg(json_build_object(
        'id', c.id, 'task_id', c.task_id, 'period', c.period, 'completed_by', c.completed_by, 'status', c.status,
        'photo_path', c.photo_path, 'note', c.note, 'completed_at', c.completed_at, 'reviewed_at', c.reviewed_at
      )), '[]')
      from public.task_completions c
      where c.period = any (periods) or c.status = 'pending' or c.reviewed_at >= reviewed_since or c.completed_at >= completed_since
    ),
    'projects', (select coalesce(json_agg(x order by x.created_at), '[]') from public.projects x),
    'maintenance', (select coalesce(json_agg(m order by m.created_at), '[]') from public.maintenance_items m),
    'levels', (select coalesce(json_agg(l order by l.min_points desc), '[]') from public.reward_levels l),
    'adjustments', (
      select coalesce(json_agg(a order by a.created_at desc), '[]') from public.point_adjustments a where a.created_at >= reviewed_since
    ),
    -- Pågående och kommande händelser, bara när sidan ber om dem.
    'events', case when events_from is null then null else (
      select coalesce(json_agg(e order by e.start_date), '[]') from public.events e
      where e.end_date >= events_from or (e.end_date is null and e.start_date >= events_from)
    ) end
  )
$$;

revoke execute on function public.family_data(text[], timestamptz, timestamptz, date) from public, anon;
grant execute on function public.family_data(text[], timestamptz, timestamptz, date) to authenticated;
