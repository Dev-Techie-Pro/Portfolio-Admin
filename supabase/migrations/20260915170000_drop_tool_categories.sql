-- Upgrade path: migrate legacy tool_categories + tool_items.category_id, then drop tool_categories.
-- No-op when the table was never created (fresh installs use 20260907120000_tools.sql).

alter table public.tool_items
  add column if not exists site_id uuid references public.sites (id) on delete cascade,
  add column if not exists category_key text;

do $migrate$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'tool_categories'
  ) then
    return;
  end if;

  update public.tool_items ti
  set
    site_id = tc.site_id,
    category_key = tc.key
  from public.tool_categories tc
  where ti.category_id = tc.id;

  delete from public.tool_items
  where site_id is null or category_key is null;

  drop policy if exists "Public read tool items" on public.tool_items;

  alter table public.tool_items drop constraint if exists tool_items_category_id_fkey;
  drop index if exists public.tool_items_category_id_idx;
  drop index if exists public.tool_items_category_name_idx;
  alter table public.tool_items drop column if exists category_id;

  drop policy if exists "Public read tool categories" on public.tool_categories;
  drop policy if exists "Staff manage tool categories" on public.tool_categories;
  drop trigger if exists tool_categories_set_updated_at on public.tool_categories;
  drop table public.tool_categories;
end
$migrate$;

alter table public.tool_items
  alter column site_id set not null,
  alter column category_key set not null;

create index if not exists tool_items_site_id_idx on public.tool_items (site_id);
create index if not exists tool_items_site_category_key_idx on public.tool_items (site_id, category_key);
create unique index if not exists tool_items_site_category_name_idx
  on public.tool_items (site_id, category_key, lower(name));

drop policy if exists "Public read tool items" on public.tool_items;
create policy "Public read tool items"
  on public.tool_items for select
  using (exists (
    select 1 from public.categories c
    where c.site_id = tool_items.site_id
      and c.key = tool_items.category_key
      and c.deleted_at is null
  ));
