-- Remove user-configurable css_class from project and blog category tables.
-- Card accent classes are derived from category key in the app layer.

alter table public.categories
  drop column if exists css_class;

alter table public.blog_categories
  drop column if exists css_class;
