-- Reset demo-connected integrations that have no saved configuration.
update public.integrations
set
  is_connected = false,
  connected_at = null,
  config = '{}'::jsonb,
  updated_at = timezone('utc', now())
where site_id = '00000000-0000-4000-8000-000000000001'
  and is_connected = true
  and (config is null or config = '{}'::jsonb or config = '{"_secrets":{}}'::jsonb);

comment on column public.integrations.config is
  'Public integration settings (measurement IDs, URLs, etc.). Encrypted secrets are stored under config._secrets.';
