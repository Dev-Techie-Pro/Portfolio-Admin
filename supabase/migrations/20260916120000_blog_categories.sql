-- Blog categories CMS table (replaces blog_category_key enum on blog_posts).

create table public.blog_categories (
  id               uuid primary key default gen_random_uuid(),
  site_id          uuid not null references public.sites (id) on delete cascade,
  legacy_id        integer,
  key              text not null,
  label            text not null,
  description      text,
  proficiency_pct  smallint not null default 0
                     check (proficiency_pct between 0 and 100),
  icon_class       text,
  color            char(7) default '#ff6600',
  sort_order       integer not null default 0,
  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now()),
  deleted_at       timestamptz,
  version          integer not null default 1
);

create index blog_categories_site_id_idx on public.blog_categories (site_id);
create unique index blog_categories_site_key_idx on public.blog_categories (site_id, lower(key))
  where deleted_at is null;
create unique index blog_categories_site_legacy_id_idx on public.blog_categories (site_id, legacy_id)
  where legacy_id is not null;

alter table public.blog_categories
  add constraint blog_categories_site_key_unique unique (site_id, key);

create trigger blog_categories_set_updated_at
  before update on public.blog_categories
  for each row execute function public.set_updated_at();

alter table public.blog_categories enable row level security;

create policy "Public read blog categories"
  on public.blog_categories for select
  using (deleted_at is null);

create policy "Staff manage blog categories"
  on public.blog_categories for all
  using (public.is_authenticated_staff())
  with check (public.is_authenticated_staff());

-- Seed default categories for every site (from former enum values).
insert into public.blog_categories (
  site_id, legacy_id, key, label, description, proficiency_pct, icon_class, color, sort_order
)
select
  s.id,
  v.legacy_id,
  v.key,
  v.label,
  v.description,
  v.proficiency_pct,
  v.icon_class,
  v.color,
  v.sort_order
from public.sites s
cross join (
  values
    (1,  'tutorial',     'Tutorial',         'Step-by-step guides and how-tos', 85, 'ri-book-open-line',     '#3b82f6', 1),
    (2,  'case-study',   'Case Study',       'Project breakdowns and results',  85, 'ri-briefcase-line',     '#a855f7', 2),
    (3,  'career',       'Career & Growth',  'Career advice and professional growth', 80, 'ri-user-star-line', '#8b5cf6', 3),
    (4,  'news',         'News & Updates',   'Announcements and industry news', 75, 'ri-newspaper-line',     '#14b8a6', 4),
    (5,  'tips',         'Tips & Tricks',    'Quick tips and productivity hacks', 80, 'ri-lightbulb-line',   '#22c55e', 5),
    (6,  'opinion',      'Opinion',          'Thoughts and perspectives',       70, 'ri-chat-3-line',        '#f97316', 6),
    (7,  'devlog',       'Dev Log',          'Development progress logs',       75, 'ri-code-box-line',      '#06b6d4', 7),
    (8,  'announcement', 'Announcement',     'Official announcements',          90, 'ri-megaphone-line',     '#ef4444', 8)
) as v(legacy_id, key, label, description, proficiency_pct, icon_class, color, sort_order)
where not exists (
  select 1 from public.blog_categories bc
  where bc.site_id = s.id and lower(bc.key) = lower(v.key) and bc.deleted_at is null
);

-- Convert blog_posts.category_key from enum to text FK.
alter table public.blog_posts
  alter column category_key type text using category_key::text;

alter table public.blog_posts
  add constraint blog_posts_category_fkey
  foreign key (site_id, category_key)
  references public.blog_categories (site_id, key)
  on delete restrict;

drop type if exists public.blog_category_key;
