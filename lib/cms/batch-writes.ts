import { createAdminClient } from '@/lib/supabase/admin';
import { SITE_ID, legacyUuid } from './constants';

const PROJECT_STATUSES = new Set(['Completed', 'In Progress', 'Pending', 'On Hold', 'Cancelled']);

function admin() {
  return createAdminClient();
}

function normalizeProjectStatus(status) {
  if (PROJECT_STATUSES.has(status)) return status;
  if (status === 'Archived') return 'Cancelled';
  return 'Pending';
}

/** Build RPC payload from client records (stable UUIDs). */
export function projectsToBatchPayload(records, existingRows) {
  const existingByLegacy = new Map(
    (existingRows || []).map((r) => [String(r.legacy_id), r.id]),
  );

  const projects = (records || []).map((p) => ({
    id: existingByLegacy.get(String(p.id)) || legacyUuid('project', p.id),
    legacy_id: Number(p.id),
    title: p.title,
    category_key: p.catKey,
    short_description: p.desc,
    full_description: p.fullDesc,
    is_featured: !!p.featured,
    scene_key: p.scene || null,
    live_url: p.liveUrl || null,
    repo_url: p.repoUrl || null,
    featured_image_url: p.bannerImgUrl || p.imageUrl || null,
    status: normalizeProjectStatus(p.status),
    sort_order: p.sortOrder ?? 0,
    created_at: p.createdAt || new Date().toISOString(),
    tags: (p.tags || []).map((tag, i) => ({ tag, sort_order: i })),
    gallery: (p.gallery || []).map((img, i) => ({
      url: img.url,
      file_name: img.name || null,
      sort_order: i,
    })),
  }));

  const incomingLegacy = new Set((records || []).map((r) => String(r.id)));
  const deleteIds = (existingRows || [])
    .filter((e) => !incomingLegacy.has(String(e.legacy_id)))
    .map((e) => e.id);

  return { projects, deleteIds };
}

export function blogPostsToBatchPayload(records, existingRows) {
  const existingByLegacy = new Map(
    (existingRows || []).map((r) => [String(r.legacy_id), r.id]),
  );

  const posts = (records || []).map((p) => ({
    id: existingByLegacy.get(String(p.id)) || legacyUuid('blog', p.id),
    legacy_id: Number(p.id),
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt,
    content: p.content || '',
    category_key: p.category,
    status: p.status || 'Draft',
    is_featured: !!p.featured,
    featured_image_url: p.imageUrl || null,
    featured_image_alt: p.imageAlt || null,
    published_at: p.publishedAt || null,
    sort_order: p.sortOrder ?? 0,
    created_at: p.createdAt || new Date().toISOString(),
    tags: (p.tags || []).map((tag, i) => ({ tag, sort_order: i })),
  }));

  const incomingLegacy = new Set((records || []).map((r) => String(r.id)));
  const deleteIds = (existingRows || [])
    .filter((e) => !incomingLegacy.has(String(e.legacy_id)))
    .map((e) => e.id);

  return { posts, deleteIds };
}

export async function saveProjectsBatch(records, existingRows) {
  const { projects, deleteIds } = projectsToBatchPayload(records, existingRows);
  const { error } = await admin().rpc('pa_save_projects_batch', {
    p_site_id: SITE_ID,
    p_projects: projects,
    p_delete_project_ids: deleteIds,
  });
  if (error) throw error;
}

export async function saveBlogPostsBatch(records, existingRows) {
  const { posts, deleteIds } = blogPostsToBatchPayload(records, existingRows);
  const { error } = await admin().rpc('pa_save_blog_posts_batch', {
    p_site_id: SITE_ID,
    p_posts: posts,
    p_delete_post_ids: deleteIds,
  });
  if (error) throw error;
}
