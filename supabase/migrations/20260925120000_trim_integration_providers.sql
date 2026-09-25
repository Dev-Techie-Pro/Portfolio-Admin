-- Remove integrations outside the supported provider set.
-- Supported: emailjs, cloudinary, github, google_search_console

delete from public.integrations
where provider not in (
  'emailjs',
  'cloudinary',
  'github',
  'google_search_console'
);
