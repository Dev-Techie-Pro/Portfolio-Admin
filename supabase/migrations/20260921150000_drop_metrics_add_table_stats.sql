-- Drop metrics-only RPCs (System tab no longer uses Supabase Management API metrics)
drop function if exists public.pa_admin_database_size_bytes();
drop function if exists public.pa_admin_storage_stats();

-- Table catalog stats for SQL export UI (row counts + approximate on-disk size)
create or replace function public.pa_admin_public_table_stats()
returns table (table_name text, row_count bigint, size_bytes bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  tbl text;
begin
  for tbl in
    select tablename
    from pg_catalog.pg_tables
    where schemaname = 'public'
      and tablename <> 'dashboard_stats'
    order by tablename
  loop
    table_name := tbl;
    execute format('select count(*)::bigint from public.%I', tbl) into row_count;
    select pg_total_relation_size(format('public.%I', tbl)::regclass)::bigint into size_bytes;
    return next;
  end loop;
end;
$$;

revoke all on function public.pa_admin_public_table_stats() from public;
grant execute on function public.pa_admin_public_table_stats() to service_role;
