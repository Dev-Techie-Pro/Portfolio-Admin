-- Login activity feed (successful, failed, and logout events)

create type public.login_activity_status as enum ('success', 'failed', 'logout');

create table public.login_activity (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  email          text,
  status         public.login_activity_status not null,
  ip_address     text,
  user_agent     text,
  device_label   text,
  device_icon    text,
  location       text,
  failure_reason text,
  is_current     boolean not null default false,
  created_at     timestamptz not null default timezone('utc', now())
);

create index login_activity_user_id_idx on public.login_activity (user_id);
create index login_activity_created_at_idx on public.login_activity (created_at desc);
create index login_activity_user_created_idx on public.login_activity (user_id, created_at desc);

alter table public.login_activity enable row level security;

create policy "Users read own login activity"
  on public.login_activity for select
  using (auth.uid() = user_id or public.is_authenticated_admin());

create policy "Admins insert login activity"
  on public.login_activity for insert
  with check (public.is_authenticated_admin());

create policy "Admins update login activity"
  on public.login_activity for update
  using (public.is_authenticated_admin())
  with check (public.is_authenticated_admin());

-- user_sessions: allow admin API to insert successful sessions
create policy "Admins insert user sessions"
  on public.user_sessions for insert
  with check (public.is_authenticated_admin());
