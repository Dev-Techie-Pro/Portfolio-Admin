-- =============================================================================
-- Portfolio Admin Dashboard — Supabase schema (v1.0.0)
-- Covers: all CMS pages, settings tabs, appearance, auth profiles, backups
-- =============================================================================

-- Extensions
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------

create type public.app_role as enum (
  'super_admin',
  'admin',
  'editor',
  'viewer'
);

create type public.project_status as enum (
  'Completed',
  'In Progress',
  'Pending',
  'On Hold',
  'Cancelled'
);

create type public.blog_post_status as enum (
  'Draft',
  'Published'
);

create type public.blog_category_key as enum (
  'tutorial',
  'case-study',
  'career',
  'news',
  'tips',
  'opinion',
  'devlog',
  'announcement'
);

create type public.contact_message_status as enum (
  'new',
  'read',
  'replied',
  'spam'
);

create type public.employment_type as enum (
  'full-time',
  'part-time',
  'contract',
  'freelance',
  'internship'
);

create type public.technology_group as enum (
  'frontend',
  'backend',
  'database',
  'devops',
  'mobile',
  'design',
  'other'
);

create type public.technology_level as enum (
  'beginner',
  'intermediate',
  'advanced',
  'expert'
);

create type public.media_folder as enum (
  'general',
  'projects',
  'avatars',
  'icons',
  'blog',
  'testimonials'
);

create type public.default_view as enum (
  'grid',
  'list'
);

create type public.notification_frequency as enum (
  'instant',
  'daily',
  'weekly'
);

create type public.theme_mode as enum (
  'light',
  'dark',
  'system'
);

create type public.two_factor_method as enum (
  'authenticator',
  'sms',
  'email'
);

create type public.integration_provider as enum (
  'google_analytics',
  'google_search_console',
  'emailjs',
  'cloudinary',
  'github',
  'slack',
  'zapier',
  'webhooks'
);

create type public.backup_status as enum (
  'pending',
  'completed',
  'failed'
);

-- -----------------------------------------------------------------------------
-- SHARED TRIGGER: updated_at
-- -----------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- SITE (single-tenant root; extend with more rows for multi-site later)
-- -----------------------------------------------------------------------------

create table public.sites (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique default 'default',
  name          text not null default 'My Portfolio',
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now()),
  deleted_at    timestamptz,
  version       integer not null default 1
);

create trigger sites_set_updated_at
  before update on public.sites
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- PROFILES (extends Supabase auth.users)
-- -----------------------------------------------------------------------------

create table public.profiles (
  id              uuid primary key references auth.users (id) on delete cascade,
  site_id         uuid not null references public.sites (id) on delete restrict,
  role            public.app_role not null default 'viewer',
  full_name       text,
  username        text,
  email           text,
  phone           text,
  date_of_birth   date,
  bio             text,
  location        text,
  website_url     text,
  avatar_url      text,
  cover_image_url text,
  social_links    jsonb not null default '[]'::jsonb,
  is_active       boolean not null default true,
  email_verified_at timestamptz,
  last_login_at   timestamptz,
  created_at      timestamptz not null default timezone('utc', now()),
  updated_at      timestamptz not null default timezone('utc', now()),
  deleted_at      timestamptz,
  version         integer not null default 1,
  constraint profiles_username_unique unique (username),
  constraint profiles_email_unique unique (email),
  constraint profiles_social_links_is_array check (jsonb_typeof(social_links) = 'array')
);

create index profiles_site_id_idx on public.profiles (site_id);
create index profiles_role_idx on public.profiles (role);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- SITE SETTINGS (/settings — General + Other tabs)
-- -----------------------------------------------------------------------------

create table public.site_settings (
  id                uuid primary key default gen_random_uuid(),
  site_id           uuid not null unique references public.sites (id) on delete cascade,
  site_title        text not null default 'My Portfolio',
  site_tagline      text,
  site_url          text,
  admin_email       text,
  site_description  text,
  date_format       text default 'May 19, 2024',
  time_format       text default '12 Hour (AM/PM)',
  timezone          text default '(GMT+05:00) Islamabad, Pakistan',
  items_per_page    integer not null default 12 check (items_per_page > 0),
  default_view      public.default_view not null default 'grid',
  language          text not null default 'en',
  maintenance_mode  boolean not null default false,
  created_at        timestamptz not null default timezone('utc', now()),
  updated_at        timestamptz not null default timezone('utc', now()),
  version           integer not null default 1
);

create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- USER PREFERENCES (UI state, column visibility, active settings tab)
-- -----------------------------------------------------------------------------

create table public.user_preferences (
  user_id       uuid primary key references public.profiles (id) on delete cascade,
  preferences   jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now()),
  constraint user_preferences_is_object check (jsonb_typeof(preferences) = 'object')
);

comment on column public.user_preferences.preferences is
  'Keys: settings_active_tab, contact_messages_column_visibility, projects_view_mode, etc.';

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- APPEARANCE SETTINGS (global customization panel)
-- -----------------------------------------------------------------------------

create table public.appearance_settings (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  theme          public.theme_mode not null default 'dark',
  accent_color   char(7) not null default '#ff6600',
  font_size      text not null default '14px',
  font_family_id text not null default 'inter',
  font_weight    text not null default '400',
  corner_radius  text not null default '14px',
  card_spacing   text not null default '10px',
  created_at     timestamptz not null default timezone('utc', now()),
  updated_at     timestamptz not null default timezone('utc', now()),
  constraint appearance_accent_color_hex check (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  constraint appearance_font_size_allowed check (font_size in ('10px', '14px', '18px', '20px', '30px')),
  constraint appearance_font_weight_allowed check (font_weight in ('300', '400', '600', '700')),
  constraint appearance_corner_radius_allowed check (corner_radius in ('0px', '5px', '14px', '25px')),
  constraint appearance_card_spacing_allowed check (card_spacing in ('5px', '10px', '15px'))
);

create trigger appearance_settings_set_updated_at
  before update on public.appearance_settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- NOTIFICATION PREFERENCES (/settings — Notifications tab)
-- -----------------------------------------------------------------------------

create table public.notification_preferences (
  user_id                   uuid primary key references public.profiles (id) on delete cascade,
  email_project_updates     boolean not null default true,
  email_new_messages        boolean not null default true,
  email_contact_submissions boolean not null default true,
  email_blog_updates        boolean not null default false,
  email_system_alerts       boolean not null default true,
  email_marketing           boolean not null default false,
  channel_email             boolean not null default true,
  channel_browser           boolean not null default true,
  frequency                 public.notification_frequency not null default 'instant',
  quiet_hours_start         time not null default '22:00',
  quiet_hours_end           time not null default '07:00',
  quiet_hours_timezone      text not null default '(GMT+05:00) Islamabad, Pakistan',
  created_at                timestamptz not null default timezone('utc', now()),
  updated_at                timestamptz not null default timezone('utc', now())
);

create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- SECURITY SETTINGS (/settings — Security tab; no secrets in plain text)
-- -----------------------------------------------------------------------------

create table public.security_settings (
  user_id              uuid primary key references public.profiles (id) on delete cascade,
  two_factor_enabled   boolean not null default false,
  two_factor_method    public.two_factor_method,
  created_at           timestamptz not null default timezone('utc', now()),
  updated_at           timestamptz not null default timezone('utc', now())
);

create table public.two_factor_backup_codes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  code_hash    text not null,
  used_at      timestamptz,
  created_at   timestamptz not null default timezone('utc', now())
);

create index two_factor_backup_codes_user_id_idx on public.two_factor_backup_codes (user_id);

create trigger security_settings_set_updated_at
  before update on public.security_settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- AUTH HELPERS (RLS)
-- -----------------------------------------------------------------------------

create or replace function public.get_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid();
$$;

create or replace function public.is_authenticated_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('super_admin', 'admin', 'editor')
  );
$$;

create or replace function public.is_authenticated_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('super_admin', 'admin')
  );
$$;

-- Auto-create profile row when a Supabase Auth user signs up
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

  insert into public.user_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.appearance_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.notification_preferences (user_id) values (new.id)
  on conflict (user_id) do nothing;

  insert into public.security_settings (user_id) values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- USER SESSIONS (recent login activity UI)
-- -----------------------------------------------------------------------------

create table public.user_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  ip_address    inet,
  user_agent    text,
  device_label  text,
  location      text,
  is_current    boolean not null default false,
  expires_at    timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz not null default timezone('utc', now())
);

create index user_sessions_user_id_idx on public.user_sessions (user_id);
create index user_sessions_created_at_idx on public.user_sessions (created_at desc);

-- -----------------------------------------------------------------------------
-- INTEGRATIONS (/settings — Integrations tab)
-- -----------------------------------------------------------------------------

create table public.integrations (
  id           uuid primary key default gen_random_uuid(),
  site_id      uuid not null references public.sites (id) on delete cascade,
  provider     public.integration_provider not null,
  is_connected boolean not null default false,
  config       jsonb not null default '{}'::jsonb,
  secret_ref   text,
  connected_at timestamptz,
  created_at   timestamptz not null default timezone('utc', now()),
  updated_at   timestamptz not null default timezone('utc', now()),
  deleted_at   timestamptz,
  version      integer not null default 1,
  unique (site_id, provider),
  constraint integrations_config_is_object check (jsonb_typeof(config) = 'object')
);

create trigger integrations_set_updated_at
  before update on public.integrations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- CATEGORIES (/categories)
-- -----------------------------------------------------------------------------

create table public.categories (
  site_id      uuid not null references public.sites (id) on delete cascade,
  key          text not null,
  label        text not null,
  css_class    text not null,
  description  text,
  is_builtin   boolean not null default false,
  created_at   timestamptz not null default timezone('utc', now()),
  updated_at   timestamptz not null default timezone('utc', now()),
  deleted_at   timestamptz,
  version      integer not null default 1,
  primary key (site_id, key)
);

create index categories_site_id_idx on public.categories (site_id);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- MEDIA LIBRARY (/media-library)
-- -----------------------------------------------------------------------------

create table public.media_assets (
  id              uuid primary key default gen_random_uuid(),
  site_id         uuid not null references public.sites (id) on delete cascade,
  legacy_id       integer,
  file_name       text not null,
  url             text not null,
  storage_path    text,
  alt_text        text,
  folder          public.media_folder not null default 'general',
  size_bytes      bigint not null default 0 check (size_bytes >= 0),
  mime_type       text not null default 'application/octet-stream',
  usage_count     integer not null default 0 check (usage_count >= 0),
  uploaded_at     timestamptz not null default timezone('utc', now()),
  created_at      timestamptz not null default timezone('utc', now()),
  updated_at      timestamptz not null default timezone('utc', now()),
  deleted_at      timestamptz,
  version         integer not null default 1
);

create index media_assets_site_id_idx on public.media_assets (site_id);
create index media_assets_folder_idx on public.media_assets (folder);
create index media_assets_uploaded_at_idx on public.media_assets (uploaded_at desc);
create unique index media_assets_site_legacy_id_idx on public.media_assets (site_id, legacy_id)
  where legacy_id is not null;

create trigger media_assets_set_updated_at
  before update on public.media_assets
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- PROJECTS (/projects)
-- -----------------------------------------------------------------------------

create table public.projects (
  id                  uuid primary key default gen_random_uuid(),
  site_id             uuid not null references public.sites (id) on delete cascade,
  legacy_id           integer,
  title               text not null,
  category_key        text not null,
  foreign key (site_id, category_key) references public.categories (site_id, key) on delete restrict,
  short_description   text not null,
  full_description    text not null,
  is_featured         boolean not null default false,
  scene_key           text,
  live_url            text,
  repo_url            text,
  featured_image_url  text,
  status              public.project_status not null default 'Pending',
  sort_order          integer not null default 0,
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now()),
  deleted_at          timestamptz,
  version             integer not null default 1
);

create index projects_site_id_idx on public.projects (site_id);
create index projects_category_key_idx on public.projects (category_key);
create index projects_status_idx on public.projects (status);
create index projects_sort_order_idx on public.projects (sort_order);
create unique index projects_site_legacy_id_idx on public.projects (site_id, legacy_id)
  where legacy_id is not null;

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create table public.project_tags (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  tag         text not null,
  sort_order  integer not null default 0,
  unique (project_id, tag)
);

create index project_tags_project_id_idx on public.project_tags (project_id);

create table public.project_gallery_images (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects (id) on delete cascade,
  url         text not null,
  file_name   text,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default timezone('utc', now())
);

create index project_gallery_images_project_id_idx on public.project_gallery_images (project_id);

-- -----------------------------------------------------------------------------
-- TECHNOLOGIES (/technologies)
-- -----------------------------------------------------------------------------

create table public.technologies (
  id                 uuid primary key default gen_random_uuid(),
  site_id            uuid not null references public.sites (id) on delete cascade,
  legacy_id          integer,
  name               text not null,
  group_key          public.technology_group not null,
  level_key          public.technology_level not null,
  documentation_url  text,
  description        text,
  years_experience   numeric(4, 1) check (years_experience is null or years_experience >= 0),
  is_featured        boolean not null default false,
  sort_order         integer not null default 0,
  created_at         timestamptz not null default timezone('utc', now()),
  updated_at         timestamptz not null default timezone('utc', now()),
  deleted_at         timestamptz,
  version            integer not null default 1
);

create index technologies_site_id_idx on public.technologies (site_id);
create unique index technologies_site_name_idx on public.technologies (site_id, lower(name))
  where deleted_at is null;
create unique index technologies_site_legacy_id_idx on public.technologies (site_id, legacy_id)
  where legacy_id is not null;

create trigger technologies_set_updated_at
  before update on public.technologies
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- EXPERIENCE (/experience)
-- -----------------------------------------------------------------------------

create table public.experience_entries (
  id               uuid primary key default gen_random_uuid(),
  site_id          uuid not null references public.sites (id) on delete cascade,
  legacy_id        integer,
  job_title        text not null,
  company          text not null,
  location         text,
  employment_type  public.employment_type not null,
  start_date       char(7) not null,
  end_date         char(7),
  is_current       boolean not null default false,
  description      text,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now()),
  deleted_at       timestamptz,
  version          integer not null default 1,
  constraint experience_start_date_format check (start_date ~ '^\d{4}-\d{2}$'),
  constraint experience_end_date_format check (end_date is null or end_date ~ '^\d{4}-\d{2}$'),
  constraint experience_current_end_date check (
    (is_current = true and end_date is null) or (is_current = false)
  )
);

create index experience_entries_site_id_idx on public.experience_entries (site_id);
create unique index experience_entries_site_legacy_id_idx on public.experience_entries (site_id, legacy_id)
  where legacy_id is not null;

create trigger experience_entries_set_updated_at
  before update on public.experience_entries
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- TESTIMONIALS (/testimonials)
-- -----------------------------------------------------------------------------

create table public.testimonials (
  id           uuid primary key default gen_random_uuid(),
  site_id      uuid not null references public.sites (id) on delete cascade,
  legacy_id    integer,
  client_name  text not null,
  client_role  text,
  company      text,
  quote        text not null,
  rating       smallint not null default 5 check (rating between 1 and 5),
  avatar_url   text,
  avatar_alt   text,
  is_featured  boolean not null default false,
  created_at   timestamptz not null default timezone('utc', now()),
  updated_at   timestamptz not null default timezone('utc', now()),
  deleted_at   timestamptz,
  version      integer not null default 1
);

create index testimonials_site_id_idx on public.testimonials (site_id);
create unique index testimonials_site_legacy_id_idx on public.testimonials (site_id, legacy_id)
  where legacy_id is not null;

create trigger testimonials_set_updated_at
  before update on public.testimonials
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- BLOG POSTS (/blog-post)
-- -----------------------------------------------------------------------------

create table public.blog_posts (
  id                  uuid primary key default gen_random_uuid(),
  site_id             uuid not null references public.sites (id) on delete cascade,
  legacy_id           integer,
  title               text not null,
  slug                text not null,
  excerpt             text not null,
  content             text not null,
  category_key        public.blog_category_key not null,
  status              public.blog_post_status not null default 'Draft',
  is_featured         boolean not null default false,
  featured_image_url  text,
  featured_image_alt  text,
  published_at        date,
  sort_order          integer not null default 0,
  created_at          timestamptz not null default timezone('utc', now()),
  updated_at          timestamptz not null default timezone('utc', now()),
  deleted_at          timestamptz,
  version             integer not null default 1,
  constraint blog_posts_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index blog_posts_site_slug_idx on public.blog_posts (site_id, slug)
  where deleted_at is null;
create index blog_posts_site_status_idx on public.blog_posts (site_id, status);
create unique index blog_posts_site_legacy_id_idx on public.blog_posts (site_id, legacy_id)
  where legacy_id is not null;

create trigger blog_posts_set_updated_at
  before update on public.blog_posts
  for each row execute function public.set_updated_at();

create table public.blog_post_tags (
  id           uuid primary key default gen_random_uuid(),
  blog_post_id uuid not null references public.blog_posts (id) on delete cascade,
  tag          text not null,
  sort_order   integer not null default 0,
  unique (blog_post_id, tag)
);

create index blog_post_tags_blog_post_id_idx on public.blog_post_tags (blog_post_id);

-- -----------------------------------------------------------------------------
-- CONTACT MESSAGES (/contact-messages)
-- -----------------------------------------------------------------------------

create table public.contact_messages (
  id            uuid primary key default gen_random_uuid(),
  site_id       uuid not null references public.sites (id) on delete cascade,
  legacy_id     integer,
  sender_name   text not null,
  sender_email  text not null,
  subject       text not null,
  snippet       text,
  body          text not null,
  status        public.contact_message_status not null default 'new',
  sender_ip     inet,
  reply_body    text,
  replied_at    timestamptz,
  is_starred    boolean not null default false,
  created_at    timestamptz not null default timezone('utc', now()),
  updated_at    timestamptz not null default timezone('utc', now()),
  deleted_at    timestamptz,
  version       integer not null default 1
);

create index contact_messages_site_id_idx on public.contact_messages (site_id);
create index contact_messages_status_idx on public.contact_messages (status);
create index contact_messages_created_at_idx on public.contact_messages (created_at desc);
create unique index contact_messages_site_legacy_id_idx on public.contact_messages (site_id, legacy_id)
  where legacy_id is not null;

create trigger contact_messages_set_updated_at
  before update on public.contact_messages
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- BACKUP SNAPSHOTS (/backup-restore)
-- -----------------------------------------------------------------------------

create table public.backup_snapshots (
  id             uuid primary key default gen_random_uuid(),
  site_id        uuid not null references public.sites (id) on delete cascade,
  filename       text not null,
  storage_path   text not null,
  size_bytes     bigint not null default 0,
  record_counts  jsonb not null default '{}'::jsonb,
  schema_version text not null default '1.0.0',
  status         public.backup_status not null default 'pending',
  error_message  text,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default timezone('utc', now()),
  completed_at   timestamptz
);

create index backup_snapshots_site_id_idx on public.backup_snapshots (site_id);
create index backup_snapshots_created_at_idx on public.backup_snapshots (created_at desc);

-- -----------------------------------------------------------------------------
-- DASHBOARD VIEW (read-only aggregation for /)
-- -----------------------------------------------------------------------------

create or replace view public.dashboard_stats as
select
  s.id as site_id,
  (select count(*) from public.projects p where p.site_id = s.id and p.deleted_at is null) as total_projects,
  (select count(*) from public.technologies t where t.site_id = s.id and t.deleted_at is null) as total_technologies,
  (select count(*) from public.media_assets m where m.site_id = s.id and m.deleted_at is null) as total_media,
  (select count(*) from public.testimonials tm where tm.site_id = s.id and tm.deleted_at is null) as total_testimonials,
  (select count(*) from public.experience_entries e where e.site_id = s.id and e.deleted_at is null) as total_experience,
  (select count(*) from public.blog_posts b where b.site_id = s.id and b.deleted_at is null) as total_blog_posts,
  (select count(*) from public.contact_messages c where c.site_id = s.id and c.deleted_at is null) as total_contact_messages
from public.sites s
where s.deleted_at is null;

-- -----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- -----------------------------------------------------------------------------

alter table public.sites enable row level security;
alter table public.profiles enable row level security;
alter table public.site_settings enable row level security;
alter table public.user_preferences enable row level security;
alter table public.appearance_settings enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.security_settings enable row level security;
alter table public.two_factor_backup_codes enable row level security;
alter table public.user_sessions enable row level security;
alter table public.integrations enable row level security;
alter table public.categories enable row level security;
alter table public.media_assets enable row level security;
alter table public.projects enable row level security;
alter table public.project_tags enable row level security;
alter table public.project_gallery_images enable row level security;
alter table public.technologies enable row level security;
alter table public.experience_entries enable row level security;
alter table public.testimonials enable row level security;
alter table public.blog_posts enable row level security;
alter table public.blog_post_tags enable row level security;
alter table public.contact_messages enable row level security;
alter table public.backup_snapshots enable row level security;

-- Public read: portfolio content (non-deleted)
create policy "Public read categories"
  on public.categories for select
  using (deleted_at is null);

create policy "Public read projects"
  on public.projects for select
  using (deleted_at is null);

create policy "Public read project tags"
  on public.project_tags for select
  using (exists (
    select 1 from public.projects p
    where p.id = project_id and p.deleted_at is null
  ));

create policy "Public read project gallery"
  on public.project_gallery_images for select
  using (exists (
    select 1 from public.projects p
    where p.id = project_id and p.deleted_at is null
  ));

create policy "Public read technologies"
  on public.technologies for select
  using (deleted_at is null);

create policy "Public read experience"
  on public.experience_entries for select
  using (deleted_at is null);

create policy "Public read testimonials"
  on public.testimonials for select
  using (deleted_at is null);

create policy "Public read published blog posts"
  on public.blog_posts for select
  using (deleted_at is null and status = 'Published');

create policy "Public read blog post tags"
  on public.blog_post_tags for select
  using (exists (
    select 1 from public.blog_posts b
    where b.id = blog_post_id and b.deleted_at is null and b.status = 'Published'
  ));

create policy "Public read media assets"
  on public.media_assets for select
  using (deleted_at is null);

create policy "Public read site settings"
  on public.site_settings for select
  using (true);

-- Staff write: CMS content
create policy "Staff manage categories"
  on public.categories for all
  using (public.is_authenticated_staff())
  with check (public.is_authenticated_staff());

create policy "Staff manage projects"
  on public.projects for all
  using (public.is_authenticated_staff())
  with check (public.is_authenticated_staff());

create policy "Staff manage project tags"
  on public.project_tags for all
  using (public.is_authenticated_staff())
  with check (public.is_authenticated_staff());

create policy "Staff manage project gallery"
  on public.project_gallery_images for all
  using (public.is_authenticated_staff())
  with check (public.is_authenticated_staff());

create policy "Staff manage technologies"
  on public.technologies for all
  using (public.is_authenticated_staff())
  with check (public.is_authenticated_staff());

create policy "Staff manage experience"
  on public.experience_entries for all
  using (public.is_authenticated_staff())
  with check (public.is_authenticated_staff());

create policy "Staff manage testimonials"
  on public.testimonials for all
  using (public.is_authenticated_staff())
  with check (public.is_authenticated_staff());

create policy "Staff manage all blog posts"
  on public.blog_posts for all
  using (public.is_authenticated_staff())
  with check (public.is_authenticated_staff());

create policy "Staff manage blog post tags"
  on public.blog_post_tags for all
  using (public.is_authenticated_staff())
  with check (public.is_authenticated_staff());

create policy "Staff manage media"
  on public.media_assets for all
  using (public.is_authenticated_staff())
  with check (public.is_authenticated_staff());

-- Contact messages: public can submit; staff manage
create policy "Anyone can submit contact messages"
  on public.contact_messages for insert
  with check (true);

create policy "Staff read contact messages"
  on public.contact_messages for select
  using (public.is_authenticated_staff());

create policy "Staff update contact messages"
  on public.contact_messages for update
  using (public.is_authenticated_staff())
  with check (public.is_authenticated_staff());

create policy "Staff delete contact messages"
  on public.contact_messages for delete
  using (public.is_authenticated_staff());

-- Profiles & per-user settings
create policy "Users read own profile"
  on public.profiles for select
  using (auth.uid() = id or public.is_authenticated_admin());

create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id or public.is_authenticated_admin())
  with check (auth.uid() = id or public.is_authenticated_admin());

create policy "Admins manage all profiles"
  on public.profiles for all
  using (public.is_authenticated_admin())
  with check (public.is_authenticated_admin());

create policy "Users manage own preferences"
  on public.user_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own appearance"
  on public.appearance_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own notifications"
  on public.notification_preferences for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own security settings"
  on public.security_settings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own 2fa backup codes"
  on public.two_factor_backup_codes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users read own sessions"
  on public.user_sessions for select
  using (auth.uid() = user_id or public.is_authenticated_admin());

create policy "Users manage own sessions"
  on public.user_sessions for update
  using (auth.uid() = user_id or public.is_authenticated_admin())
  with check (auth.uid() = user_id or public.is_authenticated_admin());

-- Admin-only: site settings, integrations, backups, sites
create policy "Admins manage site settings"
  on public.site_settings for all
  using (public.is_authenticated_admin())
  with check (public.is_authenticated_admin());

create policy "Admins manage integrations"
  on public.integrations for all
  using (public.is_authenticated_admin())
  with check (public.is_authenticated_admin());

create policy "Admins manage backup snapshots"
  on public.backup_snapshots for all
  using (public.is_authenticated_admin())
  with check (public.is_authenticated_admin());

create policy "Admins manage sites"
  on public.sites for all
  using (public.is_authenticated_admin())
  with check (public.is_authenticated_admin());

-- -----------------------------------------------------------------------------
-- STORAGE BUCKET (media uploads)
-- -----------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do nothing;

create policy "Public read media bucket"
  on storage.objects for select
  using (bucket_id = 'media');

create policy "Staff upload media bucket"
  on storage.objects for insert
  with check (
    bucket_id = 'media'
    and public.is_authenticated_staff()
  );

create policy "Staff update media bucket"
  on storage.objects for update
  using (
    bucket_id = 'media'
    and public.is_authenticated_staff()
  );

create policy "Staff delete media bucket"
  on storage.objects for delete
  using (
    bucket_id = 'media'
    and public.is_authenticated_staff()
  );
