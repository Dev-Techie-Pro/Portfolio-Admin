-- Restore tool_categories table and tool_items.category_id (reverses 20260915170000).

create table if not exists public.tool_categories (
  id               uuid primary key default gen_random_uuid(),
  site_id          uuid not null references public.sites (id) on delete cascade,
  legacy_id        integer,
  key              text not null,
  label            text not null,
  description      text,
  proficiency_pct  smallint not null default 0
                     check (proficiency_pct between 0 and 100),
  icon_class       text,
  color            char(7) default '#34d399',
  sort_order       integer not null default 0,
  created_at       timestamptz not null default timezone('utc', now()),
  updated_at       timestamptz not null default timezone('utc', now()),
  deleted_at       timestamptz,
  version          integer not null default 1
);

create index if not exists tool_categories_site_id_idx on public.tool_categories (site_id);
create unique index if not exists tool_categories_site_key_idx on public.tool_categories (site_id, lower(key))
  where deleted_at is null;
create unique index if not exists tool_categories_site_legacy_id_idx on public.tool_categories (site_id, legacy_id)
  where legacy_id is not null;

drop trigger if exists tool_categories_set_updated_at on public.tool_categories;
create trigger tool_categories_set_updated_at
  before update on public.tool_categories
  for each row execute function public.set_updated_at();

alter table public.tool_categories enable row level security;

drop policy if exists "Public read tool categories" on public.tool_categories;
create policy "Public read tool categories"
  on public.tool_categories for select
  using (deleted_at is null);

drop policy if exists "Staff manage tool categories" on public.tool_categories;
create policy "Staff manage tool categories"
  on public.tool_categories for all
  using (public.is_authenticated_staff())
  with check (public.is_authenticated_staff());

do $restore$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tool_items'
      and column_name = 'category_key'
  ) then
    return;
  end if;

  alter table public.tool_items
    add column if not exists category_id uuid references public.tool_categories (id) on delete cascade;

  insert into public.tool_categories (
    site_id, legacy_id, key, label, description, proficiency_pct, icon_class, color, sort_order, deleted_at
  )
  select
    ti.site_id,
    row_number() over (partition by ti.site_id order by ti.category_key)::integer,
    ti.category_key,
    coalesce(c.label, initcap(replace(ti.category_key, '-', ' '))),
    coalesce(c.description, ''),
    0,
    'ri-tools-line',
    '#34d399',
    row_number() over (partition by ti.site_id order by ti.category_key)::integer,
    null
  from (
    select distinct site_id, category_key
    from public.tool_items
    where category_key is not null
  ) ti
  left join public.categories c
    on c.site_id = ti.site_id
    and c.key = ti.category_key
    and c.deleted_at is null
  where not exists (
    select 1
    from public.tool_categories tc
    where tc.site_id = ti.site_id
      and lower(tc.key) = lower(ti.category_key)
      and tc.deleted_at is null
  );

  update public.tool_items ti
  set category_id = tc.id
  from public.tool_categories tc
  where ti.category_id is null
    and ti.site_id = tc.site_id
    and lower(ti.category_key) = lower(tc.key)
    and tc.deleted_at is null;

  delete from public.tool_items where category_id is null;

  drop policy if exists "Public read tool items" on public.tool_items;

  drop index if exists public.tool_items_site_category_key_idx;
  drop index if exists public.tool_items_site_category_name_idx;
  drop index if exists public.tool_items_site_id_idx;

  alter table public.tool_items drop column if exists category_key;
  alter table public.tool_items drop column if exists site_id;

  alter table public.tool_items alter column category_id set not null;
end
$restore$;

create index if not exists tool_items_category_id_idx on public.tool_items (category_id);
create unique index if not exists tool_items_category_name_idx on public.tool_items (category_id, lower(name));

drop policy if exists "Public read tool items" on public.tool_items;
create policy "Public read tool items"
  on public.tool_items for select
  using (exists (
    select 1 from public.tool_categories c
    where c.id = category_id and c.deleted_at is null
  ));
