-- Batch CMS writes: projects + blog posts in a single transaction per save.

create or replace function public.pa_save_projects_batch(
  p_site_id uuid,
  p_projects jsonb,
  p_delete_project_ids uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(array_length(p_delete_project_ids, 1), 0) > 0 then
    delete from public.project_tags
    where project_id = any(p_delete_project_ids);

    delete from public.project_gallery_images
    where project_id = any(p_delete_project_ids);

    delete from public.projects
    where site_id = p_site_id
      and id = any(p_delete_project_ids);
  end if;

  if jsonb_array_length(coalesce(p_projects, '[]'::jsonb)) = 0 then
    return;
  end if;

  insert into public.projects (
    id, site_id, legacy_id, title, category_key, short_description, full_description,
    is_featured, scene_key, live_url, repo_url, featured_image_url, status, sort_order, created_at
  )
  select
    (r->>'id')::uuid,
    p_site_id,
    (r->>'legacy_id')::int,
    r->>'title',
    r->>'category_key',
    r->>'short_description',
    r->>'full_description',
    coalesce((r->>'is_featured')::boolean, false),
    r->>'scene_key',
    r->>'live_url',
    r->>'repo_url',
    r->>'featured_image_url',
    coalesce(r->>'status', 'Pending')::public.project_status,
    coalesce((r->>'sort_order')::int, 0),
    coalesce((r->>'created_at')::timestamptz, timezone('utc', now()))
  from jsonb_array_elements(p_projects) as r
  on conflict (id) do update set
    legacy_id = excluded.legacy_id,
    title = excluded.title,
    category_key = excluded.category_key,
    short_description = excluded.short_description,
    full_description = excluded.full_description,
    is_featured = excluded.is_featured,
    scene_key = excluded.scene_key,
    live_url = excluded.live_url,
    repo_url = excluded.repo_url,
    featured_image_url = excluded.featured_image_url,
    status = excluded.status,
    sort_order = excluded.sort_order,
    updated_at = timezone('utc', now());

  delete from public.project_tags
  where project_id in (
    select (r->>'id')::uuid from jsonb_array_elements(p_projects) r
  );

  insert into public.project_tags (project_id, tag, sort_order)
  select
    (p.elem->>'id')::uuid,
    t.elem->>'tag',
    coalesce((t.elem->>'sort_order')::int, (t.ord - 1)::int)
  from jsonb_array_elements(p_projects) as p(elem),
       jsonb_array_elements(coalesce(p.elem->'tags', '[]'::jsonb)) with ordinality as t(elem, ord)
  where coalesce(t.elem->>'tag', '') <> '';

  delete from public.project_gallery_images
  where project_id in (
    select (r->>'id')::uuid from jsonb_array_elements(p_projects) r
  );

  insert into public.project_gallery_images (project_id, url, file_name, sort_order)
  select
    (p.elem->>'id')::uuid,
    g.elem->>'url',
    g.elem->>'file_name',
    coalesce((g.elem->>'sort_order')::int, (g.ord - 1)::int)
  from jsonb_array_elements(p_projects) as p(elem),
       jsonb_array_elements(coalesce(p.elem->'gallery', '[]'::jsonb)) with ordinality as g(elem, ord)
  where coalesce(g.elem->>'url', '') <> '';
end;
$$;

create or replace function public.pa_save_blog_posts_batch(
  p_site_id uuid,
  p_posts jsonb,
  p_delete_post_ids uuid[] default '{}'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(array_length(p_delete_post_ids, 1), 0) > 0 then
    delete from public.blog_post_tags
    where blog_post_id = any(p_delete_post_ids);

    delete from public.blog_posts
    where site_id = p_site_id
      and id = any(p_delete_post_ids);
  end if;

  if jsonb_array_length(coalesce(p_posts, '[]'::jsonb)) = 0 then
    return;
  end if;

  insert into public.blog_posts (
    id, site_id, legacy_id, title, slug, excerpt, content, category_key, status,
    is_featured, featured_image_url, featured_image_alt, published_at, sort_order, created_at
  )
  select
    (r->>'id')::uuid,
    p_site_id,
    (r->>'legacy_id')::int,
    r->>'title',
    r->>'slug',
    r->>'excerpt',
    coalesce(r->>'content', ''),
    r->>'category_key',
    coalesce(r->>'status', 'Draft')::public.blog_post_status,
    coalesce((r->>'is_featured')::boolean, false),
    r->>'featured_image_url',
    r->>'featured_image_alt',
    (r->>'published_at')::date,
    coalesce((r->>'sort_order')::int, 0),
    coalesce((r->>'created_at')::timestamptz, timezone('utc', now()))
  from jsonb_array_elements(p_posts) as r
  on conflict (id) do update set
    legacy_id = excluded.legacy_id,
    title = excluded.title,
    slug = excluded.slug,
    excerpt = excluded.excerpt,
    content = excluded.content,
    category_key = excluded.category_key,
    status = excluded.status,
    is_featured = excluded.is_featured,
    featured_image_url = excluded.featured_image_url,
    featured_image_alt = excluded.featured_image_alt,
    published_at = excluded.published_at,
    sort_order = excluded.sort_order,
    updated_at = timezone('utc', now());

  delete from public.blog_post_tags
  where blog_post_id in (
    select (r->>'id')::uuid from jsonb_array_elements(p_posts) r
  );

  insert into public.blog_post_tags (blog_post_id, tag, sort_order)
  select
    (p.elem->>'id')::uuid,
    t.elem->>'tag',
    coalesce((t.elem->>'sort_order')::int, (t.ord - 1)::int)
  from jsonb_array_elements(p_posts) as p(elem),
       jsonb_array_elements(coalesce(p.elem->'tags', '[]'::jsonb)) with ordinality as t(elem, ord)
  where coalesce(t.elem->>'tag', '') <> '';
end;
$$;

revoke all on function public.pa_save_projects_batch(uuid, jsonb, uuid[]) from public;
revoke all on function public.pa_save_blog_posts_batch(uuid, jsonb, uuid[]) from public;
grant execute on function public.pa_save_projects_batch(uuid, jsonb, uuid[]) to service_role;
grant execute on function public.pa_save_blog_posts_batch(uuid, jsonb, uuid[]) to service_role;
