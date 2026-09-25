-- Remove unused per-user tables (prefs/theme live in site_settings instead)

drop trigger if exists user_preferences_set_updated_at on public.user_preferences;
drop trigger if exists appearance_settings_set_updated_at on public.appearance_settings;

drop table if exists public.user_preferences;
drop table if exists public.appearance_settings;

-- Stop seeding dropped tables when auth.users rows are created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  default_site_id uuid;
begin
  select id into default_site_id from public.sites where slug = 'default' limit 1;

  insert into public.profiles (id, site_id, role, full_name, username, email)
  values (
    new.id,
    default_site_id,
    'viewer',
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    new.email
  );

  insert into public.notification_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.security_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
