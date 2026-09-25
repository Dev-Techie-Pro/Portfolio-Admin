-- Cached dashboard stats (replaces hot reads against dashboard_stats view).

create table if not exists public.site_dashboard_stats (
  site_id uuid primary key references public.sites (id) on delete cascade,
  total_projects bigint not null default 0,
  total_technologies bigint not null default 0,
  total_media bigint not null default 0,
  total_testimonials bigint not null default 0,
  total_experience bigint not null default 0,
  total_blog_posts bigint not null default 0,
  total_contact_messages bigint not null default 0,
  refreshed_at timestamptz not null default timezone('utc', now())
);

alter table public.site_dashboard_stats enable row level security;

create policy "Public read dashboard stats cache"
  on public.site_dashboard_stats for select
  using (true);

create policy "Service role manages dashboard stats cache"
  on public.site_dashboard_stats for all
  using (true)
  with check (true);

create or replace function public.pa_refresh_dashboard_stats(p_site_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.site_dashboard_stats (
    site_id,
    total_projects,
    total_technologies,
    total_media,
    total_testimonials,
    total_experience,
    total_blog_posts,
    total_contact_messages,
    refreshed_at
  )
  select
    p_site_id,
    (select count(*) from public.projects where site_id = p_site_id and deleted_at is null),
    (select count(*) from public.technologies where site_id = p_site_id and deleted_at is null),
    (select count(*) from public.media_assets where site_id = p_site_id and deleted_at is null),
    (select count(*) from public.testimonials where site_id = p_site_id and deleted_at is null),
    (select count(*) from public.experience_entries where site_id = p_site_id and deleted_at is null),
    (select count(*) from public.blog_posts where site_id = p_site_id and deleted_at is null),
    (select count(*) from public.contact_messages where site_id = p_site_id and deleted_at is null),
    timezone('utc', now())
  on conflict (site_id) do update set
    total_projects = excluded.total_projects,
    total_technologies = excluded.total_technologies,
    total_media = excluded.total_media,
    total_testimonials = excluded.total_testimonials,
    total_experience = excluded.total_experience,
    total_blog_posts = excluded.total_blog_posts,
    total_contact_messages = excluded.total_contact_messages,
    refreshed_at = excluded.refreshed_at;
end;
$$;

revoke all on function public.pa_refresh_dashboard_stats(uuid) from public;
grant execute on function public.pa_refresh_dashboard_stats(uuid) to service_role;

insert into public.site_dashboard_stats (site_id)
select id from public.sites where slug = 'default'
on conflict (site_id) do nothing;

select public.pa_refresh_dashboard_stats(
  (select id from public.sites where slug = 'default' limit 1)
);
