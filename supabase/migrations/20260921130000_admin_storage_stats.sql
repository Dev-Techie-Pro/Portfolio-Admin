-- Storage usage helper for system settings metrics

create or replace function public.pa_admin_storage_stats()
returns table (total_bytes bigint, object_count bigint)
language sql
security definer
set search_path = public, storage
as $$
  select
    coalesce(sum((metadata->>'size')::bigint), 0)::bigint as total_bytes,
    count(*)::bigint as object_count
  from storage.objects;
$$;

revoke all on function public.pa_admin_storage_stats() from public;
grant execute on function public.pa_admin_storage_stats() to service_role;
