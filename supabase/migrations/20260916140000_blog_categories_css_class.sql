-- Add colour-theme class for blog categories (matches project Categories page picker).

alter table public.blog_categories
  add column if not exists css_class text;

update public.blog_categories
set css_class = case key
  when 'tutorial' then 'pa-cat-web'
  when 'case-study' then 'pa-cat-ecommerce'
  when 'career' then 'pa-cat-educational'
  when 'news' then 'pa-cat-travel'
  when 'tips' then 'pa-cat-nonprofit'
  when 'opinion' then 'pa-cat-medical'
  when 'devlog' then 'pa-cat-desktop'
  when 'announcement' then 'pa-cat-enterprise'
  else coalesce(css_class, 'pa-cat-web')
end
where css_class is null or css_class = '';
