-- Återställer lagringen för foton (bevis) och resedokument (resor).
-- Bucketarna togs bort i Supabase när testdata städades bort, och då försvann även deras policies.
-- Skriptet skapar bara det som saknas, så det går att köra igen utan risk.

insert into storage.buckets (id, name, public) values ('bevis', 'bevis', false), ('resor', 'resor', false)
  on conflict (id) do nothing;

do $$
declare
  p record;
begin
  for p in
    select * from (values
      ('familjen läser bevis', 'select', 'using', $q$bucket_id = 'bevis' and (storage.foldername(name))[1] = public.my_family()::text$q$),
      ('familjen laddar upp bevis', 'insert', 'with check', $q$bucket_id = 'bevis' and (storage.foldername(name))[1] = public.my_family()::text$q$),
      ('förälder tar bort bevis', 'delete', 'using', $q$bucket_id = 'bevis' and (storage.foldername(name))[1] = public.my_family()::text and public.is_parent()$q$),
      ('familjen läser resor', 'select', 'using', $q$bucket_id = 'resor' and (storage.foldername(name))[1] = public.my_family()::text$q$),
      ('förälder laddar upp resor', 'insert', 'with check', $q$bucket_id = 'resor' and (storage.foldername(name))[1] = public.my_family()::text and public.is_parent()$q$),
      ('förälder tar bort resor', 'delete', 'using', $q$bucket_id = 'resor' and (storage.foldername(name))[1] = public.my_family()::text and public.is_parent()$q$)
    ) as v(name, cmd, clause, expr)
  loop
    if not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = p.name) then
      execute format('create policy %I on storage.objects for %s to authenticated %s (%s)', p.name, p.cmd, p.clause, p.expr);
    end if;
  end loop;
end $$;
