import { createHash } from 'crypto';
import { createAdminClient } from '../supabase/admin';
import { SITE_ID, legacyUuid } from './constants';

const IMAGE_URL_RE = /^(https?:\/\/|data:image\/)/i;
const MEDIA_URL_RE = /^(https?:\/\/|data:)/i;

/** PostgREST / HTTP2 fail on multi‑MB JSON bodies; entity rows may still store larger data URLs. */
const MAX_MEDIA_SYNC_DATA_URL_CHARS = 64_000;

/** Whether a reference can be mirrored into media_assets (usage counts, library UI). */
export function isSyncableMediaReference(ref) {
  const url = typeof ref?.url === 'string' ? ref.url.trim() : '';
  if (!isMediaUrl(url)) return false;
  if (url.startsWith('data:') && url.length > MAX_MEDIA_SYNC_DATA_URL_CHARS) return false;
  return true;
}

function sb() {
  return createAdminClient();
}

/** @param {string | null | undefined} url */
export function isImageUrl(url) {
  return typeof url === 'string' && IMAGE_URL_RE.test(url.trim());
}

/** @param {string | null | undefined} url */
export function isMediaUrl(url) {
  return typeof url === 'string' && MEDIA_URL_RE.test(url.trim());
}

function sanitizeFileName(value) {
  return String(value || 'image')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'image';
}

function parseDataUrlMeta(url) {
  const header = url.slice(0, url.indexOf(','));
  const mimeMatch = /^data:([^;,]+)/.exec(header);
  const mimeType = mimeMatch?.[1] || 'application/octet-stream';
  const payload = url.slice(url.indexOf(',') + 1);
  const sizeBytes = payload ? Math.floor((payload.length * 3) / 4) : 0;
  const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'png';
  return { mimeType, sizeBytes, ext };
}

function deriveFileName(url, fallbackName) {
  if (url.startsWith('data:')) {
    const { ext } = parseDataUrlMeta(url);
    return `${sanitizeFileName(fallbackName)}.${ext}`;
  }

  try {
    const pathname = new URL(url).pathname;
    const base = pathname.split('/').filter(Boolean).pop();
    if (base) return decodeURIComponent(base);
  } catch {
    // ignore invalid URLs
  }

  return `${sanitizeFileName(fallbackName)}.jpg`;
}

export function deriveMimeType(url, mimeType) {
  if (mimeType && mimeType !== 'application/octet-stream') return mimeType;
  if (typeof url === 'string' && url.startsWith('data:')) return parseDataUrlMeta(url).mimeType;
  const lower = String(url || '').toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.gif')) return 'image/gif';
  if (lower.includes('.svg')) return 'image/svg+xml';
  if (lower.includes('.jpg') || lower.includes('.jpeg')) return 'image/jpeg';
  return mimeType || 'application/octet-stream';
}

export function deriveSizeBytes(url, sizeBytes) {
  if (sizeBytes != null && sizeBytes > 0) return sizeBytes;
  if (typeof url === 'string' && url.startsWith('data:')) return parseDataUrlMeta(url).sizeBytes;
  return 0;
}

/**
 * @typedef {Object} MediaReference
 * @property {string} url
 * @property {string} folder
 * @property {string} [alt]
 * @property {string} [fileName]
 * @property {number} [sizeBytes]
 * @property {string} [mimeType]
 */

/**
 * @param {MediaReference[]} references
 */
export function dedupeMediaReferences(references) {
  const byUrl = new Map();
  for (const ref of references) {
    if (!isMediaUrl(ref?.url)) continue;
    const url = ref.url.trim();
    const existing = byUrl.get(url);
    if (!existing) {
      byUrl.set(url, { ...ref, url });
      continue;
    }
    if (!existing.alt && ref.alt) existing.alt = ref.alt;
    if (!existing.fileName && ref.fileName) existing.fileName = ref.fileName;
  }
  return Array.from(byUrl.values());
}

async function getNextMediaLegacyId(client) {
  const { data, error } = await client
    .from('media_assets')
    .select('legacy_id')
    .eq('site_id', SITE_ID)
    .not('legacy_id', 'is', null)
    .order('legacy_id', { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0]?.legacy_id ?? 0) + 1;
}

function hashUrl(url) {
  return createHash('sha256').update(url.trim()).digest('hex');
}

export { hashUrl };

async function findExistingByUrls(client, urls) {
  const existingByHash = new Map();
  const hashes = [...new Set(urls.map((url) => hashUrl(url)))];
  if (!hashes.length) return existingByHash;

  const { data, error } = await client
    .from('media_assets')
    .select('id, url, url_hash, alt_text, file_name, source, size_bytes, mime_type')
    .eq('site_id', SITE_ID)
    .in('url_hash', hashes)
    .is('deleted_at', null);
  if (error) throw error;

  for (const row of data || []) {
    if (row.url_hash) existingByHash.set(row.url_hash, row);
  }

  return existingByHash;
}

/**
 * Ensure referenced images exist in media_assets.
 * @param {MediaReference[]} references
 */
export async function ensureMediaAssets(references) {
  const refs = dedupeMediaReferences(references).filter(isSyncableMediaReference);
  if (!refs.length) return;

  const client = sb();
  const urls = refs.map((r) => r.url);
  const existingByHash = await findExistingByUrls(client, urls);
  let nextLegacyId = await getNextMediaLegacyId(client);

  for (const ref of refs) {
    const existing = existingByHash.get(hashUrl(ref.url));
    if (existing) {
      const updates = {};
      if (ref.alt && !existing.alt_text) updates.alt_text = ref.alt;
      if (ref.fileName && existing.file_name === 'image.jpg') updates.file_name = ref.fileName;
      if (existing.source !== 'manual') updates.source = 'entity';
      const nextSize = deriveSizeBytes(ref.url, ref.sizeBytes ?? existing.size_bytes);
      if (nextSize > 0 && !existing.size_bytes) updates.size_bytes = nextSize;
      const nextMime = deriveMimeType(ref.url, ref.mimeType ?? existing.mime_type);
      if (nextMime && nextMime !== 'application/octet-stream' && (!existing.mime_type || existing.mime_type === 'application/octet-stream')) {
        updates.mime_type = nextMime;
      }
      if (Object.keys(updates).length) {
        const { error } = await client.from('media_assets').update(updates).eq('id', existing.id);
        if (error) throw error;
      }
      continue;
    }

    const legacyId = nextLegacyId++;
    const fileName = ref.fileName || deriveFileName(ref.url, ref.alt || 'image');
    const { error } = await client.from('media_assets').upsert({
      id: legacyUuid('media', legacyId),
      site_id: SITE_ID,
      legacy_id: legacyId,
      file_name: fileName,
      url: ref.url,
      url_hash: hashUrl(ref.url),
      alt_text: ref.alt || null,
      folder: ref.folder || 'general',
      size_bytes: deriveSizeBytes(ref.url, ref.sizeBytes),
      mime_type: deriveMimeType(ref.url, ref.mimeType),
      usage_count: 0,
      source: 'entity',
      uploaded_at: new Date().toISOString(),
    });
    if (error) throw error;
  }
}

/** @param {Array<Record<string, unknown>>} projects */
export function collectProjectMediaRefs(projects) {
  const refs = [];
  for (const project of projects || []) {
    const title = project.title || 'project';
    const banner = project.bannerImgUrl || project.imageUrl;
    if (isImageUrl(banner)) {
      refs.push({
        url: banner,
        folder: 'projects',
        alt: project.title || '',
        fileName: deriveFileName(banner, `${title}-banner`),
      });
    }
    for (const image of project.gallery || []) {
      if (!isImageUrl(image?.url)) continue;
      refs.push({
        url: image.url,
        folder: 'projects',
        alt: project.title || '',
        fileName: image.name || deriveFileName(image.url, `${title}-gallery`),
      });
    }
  }
  return refs;
}

/** @param {Array<Record<string, unknown>>} posts */
export function collectBlogMediaRefs(posts) {
  const refs = [];
  for (const post of posts || []) {
    if (!isImageUrl(post.imageUrl)) continue;
    refs.push({
      url: post.imageUrl,
      folder: 'blog',
      alt: post.imageAlt || post.title || '',
      fileName: deriveFileName(post.imageUrl, `${post.title || 'blog'}-featured`),
    });
  }
  return refs;
}

/** @param {Array<Record<string, unknown>>} records */
export function collectTestimonialMediaRefs(records) {
  const refs = [];
  for (const item of records || []) {
    if (!isImageUrl(item.imageUrl)) continue;
    refs.push({
      url: item.imageUrl,
      folder: 'testimonials',
      alt: item.imageAlt || item.name || '',
      fileName: deriveFileName(item.imageUrl, `${item.name || 'testimonial'}-avatar`),
    });
  }
  return refs;
}

/** @param {Array<Record<string, unknown>>} items */
export function collectToolMediaRefs(items) {
  const refs = [];
  for (const item of items || []) {
    if (!isImageUrl(item.iconUrl)) continue;
    refs.push({
      url: item.iconUrl,
      folder: 'icons',
      alt: item.name || '',
      fileName: deriveFileName(item.iconUrl, `${item.name || 'tool'}-icon`),
    });
  }
  return refs;
}

/** @param {Array<Record<string, unknown>>} categories @deprecated nested items */
export function collectLegacyToolMediaRefs(categories) {
  const refs = [];
  for (const category of categories || []) {
    for (const item of category.items || []) {
      if (!isImageUrl(item.iconUrl)) continue;
      refs.push({
        url: item.iconUrl,
        folder: 'icons',
        alt: item.name || '',
        fileName: deriveFileName(item.iconUrl, `${item.name || 'tool'}-icon`),
      });
    }
  }
  return refs;
}

/** @param {Array<Record<string, unknown>>} replies */
export function collectContactReplyMediaRefs(replies) {
  const refs = [];
  for (const reply of replies || []) {
    const url = reply.attachment_url || reply.attachmentUrl;
    if (!isMediaUrl(url)) continue;
    const fileName = reply.attachment_name || reply.attachmentName || deriveFileName(url, 'attachment');
    refs.push({
      url,
      folder: 'contact',
      alt: fileName,
      fileName,
      sizeBytes: reply.attachment_size ?? reply.attachmentSize,
      mimeType: reply.attachment_mime || reply.attachmentMime,
    });
  }
  return refs;
}

/** @param {Array<Record<string, unknown>>} records */
export function collectDirectMediaRefs(records) {
  const refs = [];
  for (const item of records || []) {
    if (!isMediaUrl(item.url)) continue;
    refs.push({
      url: item.url,
      folder: item.folder || 'general',
      alt: item.alt || '',
      fileName: item.name || deriveFileName(item.url, item.alt || 'media'),
      sizeBytes: item.size,
      mimeType: item.type,
    });
  }
  return refs;
}

async function collectAllImageUrlCounts(client) {
  const counts = new Map();

  const add = (url, amount = 1) => {
    if (!isMediaUrl(url)) return;
    const key = url.trim();
    counts.set(key, (counts.get(key) || 0) + amount);
  };

  const { data: projects, error: projectsError } = await client
    .from('projects')
    .select('id, featured_image_url')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (projectsError) throw projectsError;

  const projectIds = (projects || []).map((row) => row.id);
  for (const project of projects || []) add(project.featured_image_url);

  if (projectIds.length) {
    const { data: gallery, error: galleryError } = await client
      .from('project_gallery_images')
      .select('url')
      .in('project_id', projectIds);
    if (galleryError) throw galleryError;
    for (const image of gallery || []) add(image.url);
  }

  const { data: blogPosts, error: blogError } = await client
    .from('blog_posts')
    .select('featured_image_url')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (blogError) throw blogError;
  for (const post of blogPosts || []) add(post.featured_image_url);

  const { data: testimonials, error: testimonialsError } = await client
    .from('testimonials')
    .select('avatar_url')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (testimonialsError) throw testimonialsError;
  for (const item of testimonials || []) add(item.avatar_url);

  const { data: categories, error: categoriesError } = await client
    .from('tool_categories')
    .select('id')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (categoriesError) throw categoriesError;

  const categoryIds = (categories || []).map((row) => row.id);
  if (categoryIds.length) {
    const { data: toolItems, error: toolsError } = await client
      .from('tool_items')
      .select('icon_url')
      .in('category_id', categoryIds);
    if (toolsError) throw toolsError;
    for (const item of toolItems || []) add(item.icon_url);
  }

  const { data: profiles, error: profilesError } = await client
    .from('profiles')
    .select('avatar_url, cover_image_url')
    .eq('site_id', SITE_ID);
  if (profilesError) throw profilesError;
  for (const profile of profiles || []) {
    add(profile.avatar_url);
    add(profile.cover_image_url);
  }

  const { data: contactReplies, error: contactRepliesError } = await client
    .from('contact_message_replies')
    .select('attachment_url, contact_messages!inner(site_id)')
    .eq('contact_messages.site_id', SITE_ID)
    .not('attachment_url', 'is', null);
  if (contactRepliesError) throw contactRepliesError;
  for (const reply of contactReplies || []) add(reply.attachment_url);

  return counts;
}

/** Count references for a bounded URL set only (scoped media reconcile). */
async function collectImageUrlCountsForUrls(client, urls) {
  const counts = new Map();
  const urlSet = new Set((urls || []).map((u) => u.trim()).filter(isMediaUrl));
  if (!urlSet.size) return counts;

  const urlList = [...urlSet];
  const add = (url, amount = 1) => {
    const key = typeof url === 'string' ? url.trim() : '';
    if (!key || !urlSet.has(key)) return;
    counts.set(key, (counts.get(key) || 0) + amount);
  };

  const { data: projects, error: projectsError } = await client
    .from('projects')
    .select('featured_image_url')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null)
    .in('featured_image_url', urlList);
  if (projectsError) throw projectsError;
  for (const project of projects || []) add(project.featured_image_url);

  const { data: gallery, error: galleryError } = await client
    .from('project_gallery_images')
    .select('url')
    .in('url', urlList);
  if (galleryError) throw galleryError;
  for (const image of gallery || []) add(image.url);

  const { data: blogPosts, error: blogError } = await client
    .from('blog_posts')
    .select('featured_image_url')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null)
    .in('featured_image_url', urlList);
  if (blogError) throw blogError;
  for (const post of blogPosts || []) add(post.featured_image_url);

  const { data: testimonials, error: testimonialsError } = await client
    .from('testimonials')
    .select('avatar_url')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null)
    .in('avatar_url', urlList);
  if (testimonialsError) throw testimonialsError;
  for (const item of testimonials || []) add(item.avatar_url);

  const { data: toolItems, error: toolsError } = await client
    .from('tool_items')
    .select('icon_url, tool_categories!inner(site_id)')
    .eq('tool_categories.site_id', SITE_ID)
    .in('icon_url', urlList);
  if (toolsError) throw toolsError;
  for (const item of toolItems || []) add(item.icon_url);

  const { data: profiles, error: profilesError } = await client
    .from('profiles')
    .select('avatar_url, cover_image_url')
    .eq('site_id', SITE_ID);
  if (profilesError) throw profilesError;
  for (const profile of profiles || []) {
    add(profile.avatar_url);
    add(profile.cover_image_url);
  }

  const { data: contactReplies, error: contactRepliesError } = await client
    .from('contact_message_replies')
    .select('attachment_url, contact_messages!inner(site_id)')
    .eq('contact_messages.site_id', SITE_ID)
    .in('attachment_url', urlList);
  if (contactRepliesError) throw contactRepliesError;
  for (const reply of contactReplies || []) add(reply.attachment_url);

  return counts;
}

async function refreshMediaUsageCountsForUrls(client, countsMap) {
  if (!countsMap?.size) return;
  const payload = Object.fromEntries(countsMap);
  const { error } = await client.rpc('pa_refresh_media_usage_counts', {
    p_site_id: SITE_ID,
    p_counts: payload,
  });
  if (error) throw error;
}

/** Collect every image URL currently referenced across CMS tables. */
export async function collectAllReferencedUrls(client = sb()) {
  const counts = await collectAllImageUrlCounts(client);
  return new Set(counts.keys());
}

/** Remove entity-synced media that is no longer referenced anywhere. */
export async function pruneOrphanedEntityMedia() {
  const client = sb();
  const referenced = await collectAllReferencedUrls(client);

  const { data: assets, error: assetsError } = await client
    .from('media_assets')
    .select('id, url, source')
    .eq('site_id', SITE_ID)
    .eq('source', 'entity')
    .is('deleted_at', null);
  if (assetsError) throw assetsError;

  const orphanIds = (assets || [])
    .filter((asset) => !referenced.has(asset.url.trim()))
    .map((asset) => asset.id);

  if (!orphanIds.length) return { removed: 0 };

  const { error: deleteError } = await client
    .from('media_assets')
    .delete()
    .in('id', orphanIds);
  if (deleteError) throw deleteError;

  return { removed: orphanIds.length };
}

/** Recompute usage_count for every media_assets row from live entity references. */
export async function refreshMediaUsageCounts() {
  const client = sb();
  const counts = await collectAllImageUrlCounts(client);

  const { data: assets, error: assetsError } = await client
    .from('media_assets')
    .select('url, usage_count')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (assetsError) throw assetsError;

  const fullCounts = new Map();
  for (const asset of assets || []) {
    fullCounts.set(asset.url.trim(), counts.get(asset.url.trim()) || 0);
  }
  await refreshMediaUsageCountsForUrls(client, fullCounts);
}

/** Remove entity-synced media in a URL set that is no longer referenced. */
export async function pruneOrphanedEntityMediaForUrls(urls) {
  const normalized = [...new Set((urls || []).filter(isMediaUrl).map((u) => u.trim()))];
  if (!normalized.length) return { removed: 0 };

  const client = sb();
  const counts = await collectImageUrlCountsForUrls(client, normalized);

  const { data: assets, error: assetsError } = await client
    .from('media_assets')
    .select('id, url, source')
    .eq('site_id', SITE_ID)
    .eq('source', 'entity')
    .is('deleted_at', null)
    .in('url', normalized);
  if (assetsError) throw assetsError;

  const orphanIds = (assets || [])
    .filter((asset) => !(counts.get(asset.url.trim()) || 0))
    .map((asset) => asset.id);

  if (!orphanIds.length) return { removed: 0 };

  const { error: deleteError } = await client
    .from('media_assets')
    .delete()
    .in('id', orphanIds);
  if (deleteError) throw deleteError;

  return { removed: orphanIds.length };
}

/**
 * Reconcile media for a bounded reference set (after a single-entity or batch save).
 * Does NOT full-scan the database when the reference set is small.
 */
export async function reconcileEntityMediaForRefs(references) {
  if (process.env.MEDIA_FULL_RECONCILE === 'true') {
    return reconcileAllEntityMedia();
  }

  const refs = dedupeMediaReferences(references).filter(isSyncableMediaReference);
  const urls = refs.map((ref) => ref.url.trim()).filter(isMediaUrl);
  if (!urls.length) return { ensured: 0, removed: 0 };

  await ensureMediaAssets(refs);

  const client = sb();
  const counts = await collectImageUrlCountsForUrls(client, urls);
  await refreshMediaUsageCountsForUrls(client, counts);

  const pruned = await pruneOrphanedEntityMediaForUrls(urls);
  return { ensured: refs.length, removed: pruned.removed };
}

/** Reconcile media for a bounded URL set. */
export async function reconcileEntityMediaForUrls(urls) {
  const refs = (urls || [])
    .filter(isMediaUrl)
    .map((url) => ({ url: url.trim(), folder: 'general' }));
  return reconcileEntityMediaForRefs(refs);
}

/**
 * Sync entity images into media_assets, refresh usage counts, and prune orphans.
 * @param {MediaReference[]} references
 */
export async function syncEntityMedia(references) {
  await ensureMediaAssets(references);
  await refreshMediaUsageCounts();
  return pruneOrphanedEntityMedia();
}

/** Full reconciliation from database state (backfill / repair). */
export async function reconcileAllEntityMedia() {
  const client = sb();

  const { data: projectRows, error: projectsError } = await client
    .from('projects')
    .select('id, title, featured_image_url')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (projectsError) throw projectsError;

  const projectIds = (projectRows || []).map((row) => row.id);
  let gallery = [];
  if (projectIds.length) {
    const { data: galleryRows, error: galleryError } = await client
      .from('project_gallery_images')
      .select('url, file_name, project_id')
      .in('project_id', projectIds);
    if (galleryError) throw galleryError;
    gallery = galleryRows || [];
  }

  const projectRefs = (projectRows || []).flatMap((project) => collectProjectMediaRefs([{
    title: project.title,
    bannerImgUrl: project.featured_image_url,
    gallery: gallery
      .filter((image) => image.project_id === project.id)
      .map((image) => ({ url: image.url, name: image.file_name })),
  }]));

  const { data: blogPosts, error: blogError } = await client
    .from('blog_posts')
    .select('title, featured_image_url, featured_image_alt')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (blogError) throw blogError;

  const { data: testimonials, error: testimonialsError } = await client
    .from('testimonials')
    .select('client_name, avatar_url, avatar_alt')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (testimonialsError) throw testimonialsError;

  let toolItems = [];
  const { data: categories, error: categoriesError } = await client
    .from('tool_categories')
    .select('id')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (categoriesError) throw categoriesError;
  const categoryIds = (categories || []).map((row) => row.id);
  if (categoryIds.length) {
    const { data: items, error: toolsError } = await client
      .from('tool_items')
      .select('name, icon_url')
      .in('category_id', categoryIds);
    if (toolsError) throw toolsError;
    toolItems = items || [];
  }

  const { data: profiles, error: profilesError } = await client
    .from('profiles')
    .select('full_name, username, avatar_url, cover_image_url')
    .eq('site_id', SITE_ID);
  if (profilesError) throw profilesError;

  const { data: contactReplies, error: contactRepliesError } = await client
    .from('contact_message_replies')
    .select('attachment_url, attachment_name, attachment_mime, attachment_size, contact_messages!inner(site_id)')
    .eq('contact_messages.site_id', SITE_ID)
    .not('attachment_url', 'is', null);
  if (contactRepliesError) throw contactRepliesError;

  const allRefs = dedupeMediaReferences([
    ...projectRefs,
    ...collectBlogMediaRefs((blogPosts || []).map((post) => ({
      title: post.title,
      imageUrl: post.featured_image_url,
      imageAlt: post.featured_image_alt,
    }))),
    ...collectTestimonialMediaRefs((testimonials || []).map((item) => ({
      name: item.client_name,
      imageUrl: item.avatar_url,
      imageAlt: item.avatar_alt,
    }))),
    ...collectToolMediaRefs((toolItems || []).map((item) => ({
      name: item.name,
      iconUrl: item.icon_url,
    }))),
    ...(profiles || []).flatMap((profile) => {
      const name = profile.full_name || profile.username || 'profile';
      const refs = [];
      if (isImageUrl(profile.avatar_url)) {
        refs.push({
          url: profile.avatar_url,
          folder: 'avatars',
          alt: name,
          fileName: deriveFileName(profile.avatar_url, `${name}-avatar`),
        });
      }
      if (isImageUrl(profile.cover_image_url)) {
        refs.push({
          url: profile.cover_image_url,
          folder: 'avatars',
          alt: `${name} cover`,
          fileName: deriveFileName(profile.cover_image_url, `${name}-cover`),
        });
      }
      return refs;
    }),
    ...collectContactReplyMediaRefs(contactReplies || []),
  ]);

  await ensureMediaAssets(allRefs);
  await backfillMediaFileMeta();
  await refreshMediaUsageCounts();
  const pruned = await pruneOrphanedEntityMedia();
  return { synced: allRefs.length, removed: pruned.removed };
}

/** Backfill size_bytes and mime_type for rows that can be derived from stored URLs. */
export async function backfillMediaFileMeta() {
  const client = sb();
  const { data: assets, error } = await client
    .from('media_assets')
    .select('id, url, size_bytes, mime_type')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null)
    .or('size_bytes.is.null,size_bytes.eq.0,mime_type.is.null,mime_type.eq.application/octet-stream');
  if (error) throw error;

  for (const asset of assets || []) {
    const nextSize = deriveSizeBytes(asset.url, asset.size_bytes);
    const nextMime = deriveMimeType(asset.url, asset.mime_type);
    const updates = {};
    if (nextSize > 0 && asset.size_bytes !== nextSize) updates.size_bytes = nextSize;
    if (
      nextMime
      && nextMime !== 'application/octet-stream'
      && asset.mime_type !== nextMime
      && (!asset.mime_type || asset.mime_type === 'application/octet-stream')
    ) {
      updates.mime_type = nextMime;
    }
    if (!Object.keys(updates).length) continue;
    const { error: updateError } = await client.from('media_assets').update(updates).eq('id', asset.id);
    if (updateError) throw updateError;
  }
}

/** Backfill media_assets from all CMS tables that store image URLs. */
export async function syncAllEntityMedia() {
  return reconcileAllEntityMedia();
}

function normalizeUrl(url) {
  return typeof url === 'string' ? url.trim() : '';
}

function mediaRecordKey(record) {
  return String(record?.id ?? '');
}

/**
 * @param {Array<{ id: number | string, url?: string, name?: string, alt?: string }>} beforeRecords
 * @param {Array<{ id: number | string, url?: string, name?: string, alt?: string }>} afterRecords
 */
export function diffMediaChanges(beforeRecords, afterRecords) {
  const beforeMap = new Map((beforeRecords || []).map((r) => [mediaRecordKey(r), r]));
  const afterMap = new Map((afterRecords || []).map((r) => [mediaRecordKey(r), r]));

  const deleted = (beforeRecords || []).filter((r) => !afterMap.has(mediaRecordKey(r)));
  const urlReplacements = [];
  const metadataUpdates = [];

  for (const [id, after] of afterMap) {
    const before = beforeMap.get(id);
    if (!before) continue;
    const oldUrl = normalizeUrl(before.url);
    const newUrl = normalizeUrl(after.url);
    if (oldUrl && newUrl && oldUrl !== newUrl) {
      urlReplacements.push({ oldUrl, newUrl });
      continue;
    }
    if (!oldUrl || oldUrl !== newUrl) continue;
    if (before.name !== after.name || before.alt !== after.alt) {
      metadataUpdates.push({
        url: oldUrl,
        name: after.name,
        alt: after.alt,
      });
    }
  }

  return { deleted, urlReplacements, metadataUpdates };
}

async function clearContactReplyAttachment(client, key, replacement = null) {
  const patch = replacement
    ? {
      attachment_url: replacement,
    }
    : {
      attachment_url: null,
      attachment_name: null,
      attachment_mime: null,
      attachment_size: null,
    };
  const { error } = await client
    .from('contact_message_replies')
    .update(patch)
    .eq('attachment_url', key);
  if (error) throw error;
}

async function removeUrlFromAllEntities(url) {
  const key = normalizeUrl(url);
  if (!key || !isMediaUrl(key)) return;

  const client = sb();

  const { error: projectBannerError } = await client
    .from('projects')
    .update({ featured_image_url: null })
    .eq('site_id', SITE_ID)
    .eq('featured_image_url', key);
  if (projectBannerError) throw projectBannerError;

  const { error: galleryError } = await client
    .from('project_gallery_images')
    .delete()
    .eq('url', key);
  if (galleryError) throw galleryError;

  const { error: blogError } = await client
    .from('blog_posts')
    .update({ featured_image_url: null, featured_image_alt: null })
    .eq('site_id', SITE_ID)
    .eq('featured_image_url', key);
  if (blogError) throw blogError;

  const { error: testimonialError } = await client
    .from('testimonials')
    .update({ avatar_url: null, avatar_alt: null })
    .eq('site_id', SITE_ID)
    .eq('avatar_url', key);
  if (testimonialError) throw testimonialError;

  const { data: categories, error: categoriesError } = await client
    .from('tool_categories')
    .select('id')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (categoriesError) throw categoriesError;

  const categoryIds = (categories || []).map((row) => row.id);
  if (categoryIds.length) {
    const { error: toolError } = await client
      .from('tool_items')
      .update({ icon_url: null })
      .in('category_id', categoryIds)
      .eq('icon_url', key);
    if (toolError) throw toolError;
  }

  const { data: profiles, error: profilesError } = await client
    .from('profiles')
    .select('id, avatar_url, cover_image_url')
    .eq('site_id', SITE_ID);
  if (profilesError) throw profilesError;

  for (const profile of profiles || []) {
    const updates = {};
    if (normalizeUrl(profile.avatar_url) === key) updates.avatar_url = null;
    if (normalizeUrl(profile.cover_image_url) === key) updates.cover_image_url = null;
    if (!Object.keys(updates).length) continue;
    const { error } = await client.from('profiles').update(updates).eq('id', profile.id);
    if (error) throw error;
  }

  await clearContactReplyAttachment(client, key);
}

async function replaceUrlInAllEntities(oldUrl, newUrl) {
  const oldKey = normalizeUrl(oldUrl);
  const newKey = normalizeUrl(newUrl);
  if (!oldKey || !newKey || oldKey === newKey) return;

  const client = sb();

  const { error: projectBannerError } = await client
    .from('projects')
    .update({ featured_image_url: newKey })
    .eq('site_id', SITE_ID)
    .eq('featured_image_url', oldKey);
  if (projectBannerError) throw projectBannerError;

  const { error: galleryError } = await client
    .from('project_gallery_images')
    .update({ url: newKey })
    .eq('url', oldKey);
  if (galleryError) throw galleryError;

  const { error: blogError } = await client
    .from('blog_posts')
    .update({ featured_image_url: newKey })
    .eq('site_id', SITE_ID)
    .eq('featured_image_url', oldKey);
  if (blogError) throw blogError;

  const { error: testimonialError } = await client
    .from('testimonials')
    .update({ avatar_url: newKey })
    .eq('site_id', SITE_ID)
    .eq('avatar_url', oldKey);
  if (testimonialError) throw testimonialError;

  const { data: categories, error: categoriesError } = await client
    .from('tool_categories')
    .select('id')
    .eq('site_id', SITE_ID)
    .is('deleted_at', null);
  if (categoriesError) throw categoriesError;

  const categoryIds = (categories || []).map((row) => row.id);
  if (categoryIds.length) {
    const { error: toolError } = await client
      .from('tool_items')
      .update({ icon_url: newKey })
      .in('category_id', categoryIds)
      .eq('icon_url', oldKey);
    if (toolError) throw toolError;
  }

  const { data: profiles, error: profilesError } = await client
    .from('profiles')
    .select('id, avatar_url, cover_image_url')
    .eq('site_id', SITE_ID);
  if (profilesError) throw profilesError;

  for (const profile of profiles || []) {
    const updates = {};
    if (normalizeUrl(profile.avatar_url) === oldKey) updates.avatar_url = newKey;
    if (normalizeUrl(profile.cover_image_url) === oldKey) updates.cover_image_url = newKey;
    if (!Object.keys(updates).length) continue;
    const { error } = await client.from('profiles').update(updates).eq('id', profile.id);
    if (error) throw error;
  }

  const { error: contactError } = await client
    .from('contact_message_replies')
    .update({ attachment_url: newKey })
    .eq('attachment_url', oldKey);
  if (contactError) throw contactError;
}

async function updateEntityMetadataForUrl(url, { name, alt }) {
  const key = normalizeUrl(url);
  if (!key) return;

  const client = sb();

  if (name) {
    const { error: galleryError } = await client
      .from('project_gallery_images')
      .update({ file_name: name })
      .eq('url', key);
    if (galleryError) throw galleryError;

    const { error: contactError } = await client
      .from('contact_message_replies')
      .update({ attachment_name: name })
      .eq('attachment_url', key);
    if (contactError) throw contactError;
  }

  if (alt != null) {
    const { error: blogError } = await client
      .from('blog_posts')
      .update({ featured_image_alt: alt || null })
      .eq('site_id', SITE_ID)
      .eq('featured_image_url', key);
    if (blogError) throw blogError;

    const { error: testimonialError } = await client
      .from('testimonials')
      .update({ avatar_alt: alt || null })
      .eq('site_id', SITE_ID)
      .eq('avatar_url', key);
    if (testimonialError) throw testimonialError;
  }
}

/**
 * Push media-library CRUD changes into CMS entity tables (projects, blog, etc.).
 * @param {Array<Record<string, unknown>>} beforeRecords
 * @param {Array<Record<string, unknown>>} afterRecords
 */
export async function propagateMediaChangesToEntities(beforeRecords, afterRecords) {
  const { deleted, urlReplacements, metadataUpdates } = diffMediaChanges(
    beforeRecords,
    afterRecords,
  );

  let changed = false;

  for (const record of deleted) {
    if (!record?.url) continue;
    await removeUrlFromAllEntities(record.url);
    changed = true;
  }

  for (const { oldUrl, newUrl } of urlReplacements) {
    await replaceUrlInAllEntities(oldUrl, newUrl);
    changed = true;
  }

  for (const update of metadataUpdates) {
    await updateEntityMetadataForUrl(update.url, {
      name: update.name,
      alt: update.alt,
    });
    changed = true;
  }

  return { changed, deleted: deleted.length, replaced: urlReplacements.length };
}
