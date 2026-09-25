-- Add JSON columns for appearance + contact message column prefs on site_settings
alter table public.site_settings
  add column if not exists appearance_settings jsonb not null default '{
    "theme": "dark",
    "accent": "#ff6600",
    "fontSize": "14px",
    "fontFamily": "inter",
    "fontWeight": "400",
    "cornerRadius": "14px",
    "cardSpacing": "10px"
  }'::jsonb,
  add column if not exists contact_message_columns jsonb not null default '{
    "checkbox": true,
    "from": true,
    "subject": true,
    "status": true,
    "date": true,
    "actions": true
  }'::jsonb,
  add column if not exists profile_full_name text,
  add column if not exists profile_username text,
  add column if not exists profile_role text,
  add column if not exists profile_phone text,
  add column if not exists profile_dob date,
  add column if not exists profile_bio text,
  add column if not exists profile_location text,
  add column if not exists profile_website text,
  add column if not exists profile_social_links jsonb not null default '[]'::jsonb;
