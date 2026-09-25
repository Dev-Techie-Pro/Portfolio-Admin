-- Admin helper functions for system settings (metrics + backups)

create or replace function public.pa_admin_database_size_bytes()
returns bigint
language sql
security definer
set search_path = public
as $$
  select pg_database_size(current_database());
$$;

create or replace function public.pa_admin_public_tables()
returns table (table_name text)
language sql
security definer
set search_path = public
as $$
  select tablename as table_name
  from pg_catalog.pg_tables
  where schemaname = 'public'
    and tablename not in ('dashboard_stats')
  order by tablename;
$$;

revoke all on function public.pa_admin_database_size_bytes() from public;
revoke all on function public.pa_admin_public_tables() from public;

grant execute on function public.pa_admin_database_size_bytes() to service_role;
grant execute on function public.pa_admin_public_tables() to service_role;
