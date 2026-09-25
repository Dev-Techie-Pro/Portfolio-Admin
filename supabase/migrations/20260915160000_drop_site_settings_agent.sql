-- Remove Portfolio Agent settings column
alter table public.site_settings
  drop column if exists agent_settings;
