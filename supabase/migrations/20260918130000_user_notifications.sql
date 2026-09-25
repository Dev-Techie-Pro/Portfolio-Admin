-- Per-user notification inbox (persistent bell dropdown)

create table if not exists public.user_notifications (
  id            uuid primary key default gen_random_uuid(),
  site_id       uuid not null references public.sites (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  actor_user_id uuid references public.profiles (id) on delete set null,
  category      text not null default 'other',
  title         text not null,
  body          text,
  icon          text,
  link_path     text,
  metadata      jsonb not null default '{}'::jsonb,
  activity_id   uuid references public.recent_activities (id) on delete set null,
  read_at       timestamptz,
  created_at    timestamptz not null default timezone('utc', now())
);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);

create index if not exists user_notifications_user_unread_idx
  on public.user_notifications (user_id, created_at desc)
  where read_at is null;

alter table public.user_notifications enable row level security;

create policy "Users read own notifications"
  on public.user_notifications for select
  using (auth.uid() = user_id);

create policy "Users update own notifications"
  on public.user_notifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own notifications"
  on public.user_notifications for delete
  using (auth.uid() = user_id);

create policy "Staff insert notifications"
  on public.user_notifications for insert
  with check (public.is_authenticated_staff());
