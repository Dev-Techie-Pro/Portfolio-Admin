-- Support deduplicating media_assets by URL hash (required for long base64 data URLs).

create extension if not exists pgcrypto with schema extensions;

alter table public.media_assets
  add column if not exists url_hash text;

update public.media_assets
set url_hash = encode(extensions.digest(url, 'sha256'), 'hex')
where url_hash is null;

create unique index if not exists media_assets_site_url_hash_idx
  on public.media_assets (site_id, url_hash)
  where url_hash is not null and deleted_at is null;

create index if not exists media_assets_url_hash_idx
  on public.media_assets (url_hash)
  where url_hash is not null;
