-- SQL backup helpers (table ordering for INSERT dumps)

create or replace function public.pa_admin_foreign_key_edges()
returns table (child_table text, parent_table text)
language sql
security definer
set search_path = public
as $$
  select distinct
    tc.table_name::text as child_table,
    ccu.table_name::text as parent_table
  from information_schema.table_constraints tc
  join information_schema.constraint_column_usage ccu
    on tc.constraint_name = ccu.constraint_name
   and tc.table_schema = ccu.table_schema
  where tc.constraint_type = 'FOREIGN KEY'
    and tc.table_schema = 'public';
$$;

revoke all on function public.pa_admin_foreign_key_edges() from public;
grant execute on function public.pa_admin_foreign_key_edges() to service_role;
