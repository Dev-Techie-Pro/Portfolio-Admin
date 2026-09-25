-- Tools showcase: categories (Frontend, Backend, …) with proficiency % and child tool items.

create table public.tool_categories (
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

create index tool_categories_site_id_idx on public.tool_categories (site_id);
create unique index tool_categories_site_key_idx on public.tool_categories (site_id, lower(key))
  where deleted_at is null;
create unique index tool_categories_site_legacy_id_idx on public.tool_categories (site_id, legacy_id)
  where legacy_id is not null;

create trigger tool_categories_set_updated_at
  before update on public.tool_categories
  for each row execute function public.set_updated_at();

create table public.tool_items (
  id           uuid primary key default gen_random_uuid(),
  category_id  uuid not null references public.tool_categories (id) on delete cascade,
  legacy_id    integer,
  name         text not null,
  icon_class   text,
  icon_url     text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default timezone('utc', now())
);

create index tool_items_category_id_idx on public.tool_items (category_id);
create unique index tool_items_category_name_idx on public.tool_items (category_id, lower(name));

alter table public.tool_categories enable row level security;
alter table public.tool_items enable row level security;

create policy "Public read tool categories"
  on public.tool_categories for select
  using (deleted_at is null);

create policy "Public read tool items"
  on public.tool_items for select
  using (exists (
    select 1 from public.tool_categories c
    where c.id = category_id and c.deleted_at is null
  ));

create policy "Staff manage tool categories"
  on public.tool_categories for all
  using (public.is_authenticated_staff())
  with check (public.is_authenticated_staff());

create policy "Staff manage tool items"
  on public.tool_items for all
  using (public.is_authenticated_staff())
  with check (public.is_authenticated_staff());
