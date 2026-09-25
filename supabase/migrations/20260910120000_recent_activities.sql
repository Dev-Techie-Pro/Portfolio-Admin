-- Recent activities audit log for the admin dashboard

create type public.activity_type as enum (
  'user_action',
  'system_event',
  'content_change',
  'other'
);

create type public.activity_status as enum (
  'success',
  'completed',
  'created',
  'info',
  'warning',
  'failed',
  'sent',
  'uploaded'
);

create table public.recent_activities (
  id                  uuid primary key default gen_random_uuid(),
  site_id             uuid not null references public.sites (id) on delete cascade,
  user_id             uuid references public.profiles (id) on delete set null,
  action_title        text not null,
  action_description  text,
  type                public.activity_type not null default 'other',
  status              public.activity_status not null default 'info',
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default timezone('utc', now())
);

create index recent_activities_site_id_idx on public.recent_activities (site_id);
create index recent_activities_user_id_idx on public.recent_activities (user_id);
create index recent_activities_type_idx on public.recent_activities (type);
create index recent_activities_status_idx on public.recent_activities (status);
create index recent_activities_created_at_idx on public.recent_activities (created_at desc);
create index recent_activities_site_created_idx on public.recent_activities (site_id, created_at desc);

alter table public.recent_activities enable row level security;

create policy "Staff read recent activities"
  on public.recent_activities for select
  using (public.is_authenticated_admin());

create policy "Admins insert recent activities"
  on public.recent_activities for insert
  with check (public.is_authenticated_admin());

create policy "Admins delete recent activities"
  on public.recent_activities for delete
  using (public.is_authenticated_admin());
