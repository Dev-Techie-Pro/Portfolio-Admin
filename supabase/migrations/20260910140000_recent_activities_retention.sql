-- Automatically purge recent_activities rows older than 12 hours.

create or replace function public.purge_expired_recent_activities()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.recent_activities
  where created_at < timezone('utc', now()) - interval '12 hours';
end;
$$;

comment on function public.purge_expired_recent_activities() is
  'Deletes recent_activities rows older than 12 hours. Used by pg_cron and optional manual cleanup.';

-- Schedule hourly cleanup when pg_cron is available (Supabase: enable Database → Extensions → pg_cron).
do $schedule$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid)
    from cron.job
    where jobname = 'purge-expired-recent-activities';

    perform cron.schedule(
      'purge-expired-recent-activities',
      '0 * * * *',
      $$select public.purge_expired_recent_activities();$$
    );
  end if;
end;
$schedule$;
