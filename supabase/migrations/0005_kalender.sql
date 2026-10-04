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
