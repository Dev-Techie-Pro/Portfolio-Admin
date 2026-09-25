import { createAdminClient } from '@/lib/supabase/admin';
import { SITE_ID } from './constants';

function sb() {
  return createAdminClient();
}

/** Lightweight rows for activity diffing — avoids full-table reads on PUT. */
export async function getProjectActivitySnapshots() {
  const { data, error } = await sb()
    .from('projects')
    .select('legacy_id, title, status, category_key, featured_image_url')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.legacy_id,
    title: row.title,
    status: row.status,
    catKey: row.category_key,
    bannerImgUrl: row.featured_image_url || '',
    imageUrl: row.featured_image_url || '',
  }));
}

export async function getBlogPostActivitySnapshots() {
  const { data, error } = await sb()
    .from('blog_posts')
    .select('legacy_id, title, slug, status, category_key, featured_image_url')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.legacy_id,
    title: row.title,
    slug: row.slug,
    status: row.status,
    category: row.category_key,
    imageUrl: row.featured_image_url || '',
  }));
}

export async function getTestimonialActivitySnapshots() {
  const { data, error } = await sb()
    .from('testimonials')
    .select('legacy_id, client_name, avatar_url')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.legacy_id,
    name: row.client_name,
    imageUrl: row.avatar_url || '',
  }));
}

export async function getTechnologyActivitySnapshots() {
  const { data, error } = await sb()
    .from('technologies')
    .select('legacy_id, name, level_key')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.legacy_id,
    name: row.name,
    level: row.level_key,
  }));
}

export async function getExperienceActivitySnapshots() {
  const { data, error } = await sb()
    .from('experience_entries')
    .select('legacy_id, job_title, company')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.legacy_id,
    title: row.job_title,
    company: row.company,
  }));
}

export async function getMediaActivitySnapshots() {
  const { data, error } = await sb()
    .from('media_assets')
    .select('legacy_id, file_name, url')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.legacy_id,
    name: row.file_name,
    url: row.url || '',
  }));
}

export async function getToolItemActivitySnapshots() {
  const { data, error } = await sb()
    .from('tool_items')
    .select('legacy_id, name, icon_url')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.legacy_id,
    name: row.name,
    iconUrl: row.icon_url || '',
  }));
}

export async function getProjectTagActivitySnapshots() {
  const { data, error } = await sb()
    .from('projects')
    .select('legacy_id, title, project_tags(id, tag, sort_order)')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (error) throw error;

  const rows = [];
  for (const project of data || []) {
    const tags = (project.project_tags || []).slice().sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    for (const tag of tags) {
      rows.push({
        id: tag.id,
        tag: tag.tag,
        projectLegacyId: project.legacy_id,
        projectTitle: project.title || '',
      });
    }
  }
  return rows;
}

export async function getCategoryActivitySnapshots() {
  const { data, error } = await sb()
    .from('categories')
    .select('key, label, description, is_builtin')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (error) throw error;
  const map = {};
  (data || []).forEach((row) => {
    map[row.key] = {
      label: row.label,
      desc: row.description || '',
      isBuiltin: !!row.is_builtin,
    };
  });
  return map;
}

export async function getBlogCategoryActivitySnapshots() {
  const { data, error } = await sb()
    .from('blog_categories')
    .select('legacy_id, key, label')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.legacy_id,
    key: row.key,
    label: row.label,
  }));
}

export async function getToolCategoryActivitySnapshots() {
  const { data, error } = await sb()
    .from('tool_categories')
    .select('legacy_id, key, label')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.legacy_id,
    key: row.key,
    label: row.label,
  }));
}

export async function getContactMessageActivitySnapshots() {
  const { data, error } = await sb()
    .from('contact_messages')
    .select('legacy_id, id, sender_name, subject, status')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.legacy_id != null ? row.legacy_id : row.id,
    name: row.sender_name,
    subject: row.subject,
    status: row.status,
  }));
}
