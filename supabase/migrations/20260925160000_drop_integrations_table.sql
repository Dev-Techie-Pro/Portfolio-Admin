-- Remove third-party integrations storage (Settings → Integrations removed from app).

drop policy if exists "Admins manage integrations" on public.integrations;

drop trigger if exists integrations_set_updated_at on public.integrations;

drop table if exists public.integrations;

drop type if exists public.integration_provider;
