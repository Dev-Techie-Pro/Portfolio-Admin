-- Portfolio Agent site-wide preferences (removed in 20260915160000)
alter table public.site_settings
  add column if not exists agent_settings jsonb not null default '{
    "enabled": true,
    "ollamaMode": null,
    "model": null,
    "ollamaUrl": null,
    "useLocalFallback": true,
    "includeEntityContext": true
  }'::jsonb;
