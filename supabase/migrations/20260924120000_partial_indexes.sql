-- Partial indexes for soft-delete list queries.

create index if not exists projects_site_active_created_idx
  on public.projects (site_id, created_at desc) where deleted_at is null;

create index if not exists technologies_site_active_idx
  on public.technologies (site_id, sort_order) where deleted_at is null;

create index if not exists media_assets_site_active_uploaded_idx
  on public.media_assets (site_id, uploaded_at desc) where deleted_at is null;

create index if not exists testimonials_site_active_idx
  on public.testimonials (site_id, created_at desc) where deleted_at is null;

create index if not exists experience_entries_site_active_sort_idx
  on public.experience_entries (site_id, sort_order) where deleted_at is null;
