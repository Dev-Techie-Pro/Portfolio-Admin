-- Track whether a media row was uploaded via Media Library or auto-synced from CMS entities.

create type public.media_source as enum ('manual', 'entity');

alter table public.media_assets
  add column if not exists source public.media_source not null default 'manual';

-- Rows created by entity sync (before this column existed) are safe to prune when unused.
update public.media_assets
set source = 'entity'
where source = 'manual'
  and legacy_id is not null
  and folder in ('projects', 'blog', 'testimonials', 'avatars', 'icons');

create index if not exists media_assets_source_idx
  on public.media_assets (source)
  where deleted_at is null;
