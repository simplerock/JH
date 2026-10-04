-- Åtstramning efter Supabase säkerhetsgranskning.
-- Utloggade behöver inte hjälpfunktionerna. Triggerfunktionen ska ingen anropa direkt
-- (triggers kräver inte execute-rättighet för att köras).
revoke execute on function public.my_family() from public, anon;
revoke execute on function public.is_parent() from public, anon;
grant execute on function public.my_family() to authenticated;
grant execute on function public.is_parent() to authenticated;
revoke execute on function public.completion_defaults() from public, anon, authenticated;
