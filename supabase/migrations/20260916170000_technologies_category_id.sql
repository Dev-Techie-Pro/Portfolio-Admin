-- Link technologies to tool_categories (shared category taxonomy with tools).
-- Replaces technologies.group_key enum with category_id FK.

-- Default category templates (key, label, icon, color, proficiency, sort)
create temporary table _tech_cat_defaults (
  key text primary key,
  label text not null,
  icon_class text not null,
  color char(7) not null,
  proficiency_pct smallint not null,
  sort_order integer not null
) on commit drop;

insert into _tech_cat_defaults (key, label, icon_class, color, proficiency_pct, sort_order) values
  ('frontend', 'Frontend', 'ri-layout-line', '#60a5fa', 85, 1),
  ('backend', 'Backend', 'ri-server-line', '#34d399', 85, 2),
  ('database', 'Database', 'ri-database-2-line', '#a78bfa', 80, 3),
  ('devops', 'DevOps & Cloud', 'ri-cloud-line', '#38bdf8', 75, 4),
  ('mobile', 'Mobile', 'ri-smartphone-line', '#fb923c', 70, 5),
  ('design', 'Design & Tools', 'ri-palette-line', '#f472b6', 80, 6),
  ('other', 'Other', 'ri-more-line', '#9a9aa0', 60, 7);

-- Ensure every site has the default categories (skip keys that already exist).
insert into public.tool_categories (
  site_id, legacy_id, key, label, description, proficiency_pct, icon_class, color, sort_order
)
select
  s.id,
  coalesce(mx.max_legacy, 0) + row_number() over (partition by s.id order by d.sort_order),
  d.key,
  d.label,
  null,
  d.proficiency_pct,
  d.icon_class,
  d.color,
  d.sort_order
from public.sites s
cross join _tech_cat_defaults d
left join lateral (
  select max(tc.legacy_id) as max_legacy
  from public.tool_categories tc
  where tc.site_id = s.id
) mx on true
where not exists (
  select 1
  from public.tool_categories tc
  where tc.site_id = s.id
    and lower(tc.key) = d.key
    and tc.deleted_at is null
);

-- Add nullable FK first
alter table public.technologies
  add column if not exists category_id uuid references public.tool_categories (id) on delete restrict;

-- Backfill from group_key → matching tool_categories.key
update public.technologies t
set category_id = c.id
from public.tool_categories c
where t.category_id is null
  and c.site_id = t.site_id
  and c.deleted_at is null
  and lower(c.key) = t.group_key::text;

-- Fallback: any remaining rows → site "other" category
update public.technologies t
set category_id = c.id
from public.tool_categories c
where t.category_id is null
  and c.site_id = t.site_id
  and c.deleted_at is null
  and lower(c.key) = 'other';

-- Last resort: first category for that site
update public.technologies t
set category_id = (
  select c.id
  from public.tool_categories c
  where c.site_id = t.site_id
    and c.deleted_at is null
  order by c.sort_order, c.created_at
  limit 1
)
where t.category_id is null;

alter table public.technologies
  alter column category_id set not null;

create index if not exists technologies_category_id_idx
  on public.technologies (category_id);

alter table public.technologies
  drop column if exists group_key;

drop type if exists public.technology_group;
