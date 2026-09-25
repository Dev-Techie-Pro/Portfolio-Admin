-- P1: prune user_sessions + bulk media usage_count refresh.

create or replace function public.pa_prune_user_sessions(p_keep_days int default 90)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted bigint;
begin
  delete from public.user_sessions
  where is_current = false
    and created_at < timezone('utc', now()) - make_interval(days => p_keep_days);
  get diagnostics deleted = row_count;
  return deleted;
end;
$$;

create or replace function public.pa_refresh_media_usage_counts(
  p_site_id uuid,
  p_counts jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.media_assets m
  set usage_count = coalesce((p_counts->>m.url)::int, 0),
      updated_at = timezone('utc', now())
  where m.site_id = p_site_id
    and m.deleted_at is null
    and p_counts ? m.url;
end;
$$;

revoke all on function public.pa_prune_user_sessions(int) from public;
revoke all on function public.pa_refresh_media_usage_counts(uuid, jsonb) from public;
grant execute on function public.pa_prune_user_sessions(int) to service_role;
grant execute on function public.pa_refresh_media_usage_counts(uuid, jsonb) to service_role;
