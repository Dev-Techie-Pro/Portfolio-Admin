-- Keep only four built-in categories: enterprise, ecommerce, web, nonprofit
update public.categories
set is_builtin = true
where site_id = '00000000-0000-4000-8000-000000000001'
  and key in ('enterprise', 'ecommerce', 'web', 'nonprofit');

update public.categories
set is_builtin = false
where site_id = '00000000-0000-4000-8000-000000000001'
  and key in ('educational', 'desktop', 'medical', 'travel');
