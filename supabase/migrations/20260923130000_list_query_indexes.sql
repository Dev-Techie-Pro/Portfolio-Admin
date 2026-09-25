-- List query indexes for contact messages and blog posts.

create index if not exists contact_messages_site_active_created_id_idx
  on public.contact_messages (site_id, created_at desc, id desc)
  where deleted_at is null;

create index if not exists blog_posts_site_active_created_idx
  on public.blog_posts (site_id, created_at desc)
  where deleted_at is null;
