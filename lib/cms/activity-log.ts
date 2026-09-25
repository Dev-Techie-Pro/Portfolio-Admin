import { createAdminClient } from '@/lib/supabase/admin';
import { SITE_ID } from './constants';
import { getRequestClientMeta } from '@/lib/auth/request-meta';
import { purgeExpiredRecentActivities } from './activity-retention';
import { invalidateCache, invalidateCachePrefix } from './server-cache';

const ACTIVITY_INSERT_COLUMNS = 'id, user_id, action_title, action_description, type, status, metadata, created_at';

function admin() {
  return createAdminClient();
}

/**
 * Record an activity in the recent_activities audit log.
 */
export async function recordActivity({
  userId = null,
  actionTitle,
  actionDescription = null,
  type = 'other',
  status = 'info',
  metadata = {},
  request = null,
}) {
  if (!actionTitle) return null;

  let enrichedMeta = { ...metadata };
  if (request) {
    try {
      const meta = await getRequestClientMeta(request);
      enrichedMeta = {
        ...enrichedMeta,
        ip: meta.ipAddress || enrichedMeta.ip,
        userAgent: meta.userAgent || enrichedMeta.userAgent,
        deviceLabel: meta.deviceLabel,
        location: meta.location,
      };
    } catch {
      /* non-fatal */
    }
  }

  const { data, error } = await admin()
    .from('recent_activities')
    .insert({
      site_id: SITE_ID,
      user_id: userId,
      action_title: actionTitle,
      action_description: actionDescription,
      type,
      status,
      metadata: enrichedMeta,
    })
    .select(ACTIVITY_INSERT_COLUMNS)
    .single();

  if (error) {
    console.warn('[activity-log] failed to record activity:', error.message);
    return null;
  }

  invalidateCache('cms:recent-activities');
  invalidateCachePrefix('cms:recent-activities:user');

  void purgeExpiredRecentActivities();
  try {
    const { dispatchNotificationsFromActivity } = await import('./notifications');
    void dispatchNotificationsFromActivity(data);
  } catch (err) {
    console.warn('[activity-log] notification dispatch failed:', err?.message || err);
  }
  return data;
}

/** Log a user-initiated action (login, settings change, etc.). */
export async function recordUserAction(opts) {
  return recordActivity({ ...opts, type: 'user_action' });
}

/** Log a system-level event (errors, page views, backups). */
export async function recordSystemEvent(opts) {
  return recordActivity({ ...opts, type: 'system_event' });
}

/** Log CMS content changes (projects, blog posts, media, etc.). */
export async function recordContentChange(opts) {
  return recordActivity({ ...opts, type: 'content_change' });
}

