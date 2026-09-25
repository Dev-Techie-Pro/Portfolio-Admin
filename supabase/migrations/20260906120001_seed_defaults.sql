-- =============================================================================
-- Seed default site, settings, and built-in categories
-- =============================================================================

insert into public.sites (id, slug, name)
values ('00000000-0000-4000-8000-000000000001', 'default', 'Portfolio Admin')
on conflict (slug) do nothing;

insert into public.site_settings (site_id, site_title, site_tagline, site_url, admin_email, site_description)
values (
  '00000000-0000-4000-8000-000000000001',
  'Portfolio Admin',
  'Track, Analyze, and Showcase Your Success',
  'https://myportfolio.com',
  'dev.techiesohaib@gmail.com',
  'A centralized hub to track your projects, monitor performance metrics, and showcase your work — all in one intuitive interface.'
)
on conflict (site_id) do nothing;

insert into public.categories (site_id, key, label, css_class, description, is_builtin) values
  ('00000000-0000-4000-8000-000000000001', 'enterprise',   'Enterprise Platform',      'pa-cat-enterprise',   'Large-scale business and enterprise web applications.', true),
  ('00000000-0000-4000-8000-000000000001', 'educational',  'Educational Platform',     'pa-cat-educational',  'E-learning platforms, portals, and educational tools.', false),
  ('00000000-0000-4000-8000-000000000001', 'desktop',      'Desktop Application',      'pa-cat-desktop',      'Windows, macOS, or cross-platform desktop software.', false),
  ('00000000-0000-4000-8000-000000000001', 'medical',      'Medical System',           'pa-cat-medical',      'Healthcare management, patient records, and clinical tools.', false),
  ('00000000-0000-4000-8000-000000000001', 'ecommerce',    'E-Commerce',               'pa-cat-ecommerce',    'Online stores and commerce platforms.', true),
  ('00000000-0000-4000-8000-000000000001', 'travel',       'Travel Platform',          'pa-cat-travel',       'Travel and booking applications.', false),
  ('00000000-0000-4000-8000-000000000001', 'web',          'Web Application',          'pa-cat-web',          'General web applications and SPAs.', true),
  ('00000000-0000-4000-8000-000000000001', 'nonprofit',    'Non Profit Organization',  'pa-cat-nonprofit',    'Non-profit and community organization websites.', true)
on conflict (site_id, key) do nothing;
