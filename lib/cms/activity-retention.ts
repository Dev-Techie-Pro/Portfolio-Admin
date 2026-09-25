import { createAdminClient } from '@/lib/supabase/admin';
import { SITE_ID } from './constants';

/** How long recent activity rows are kept before automatic deletion. */
export const RECENT_ACTIVITY_RETENTION_HOURS = 12;

function retentionCutoffIso() {
  const ms = RECENT_ACTIVITY_RETENTION_HOURS * 60 * 60 * 1000;
  return new Date(Date.now() - ms).toISOString();
}

/** Minimum interval between automatic purge attempts (in-process throttle). */
export const PURGE_INTERVAL_MS = 60 * 60 * 1000;

let lastPurgeAttemptAt = 0;

/**
 * Delete recent_activities rows older than the retention window.
 * Uses the service-role client so RLS does not block cleanup.
 */
export async function purgeExpiredRecentActivities() {
  const cutoff = retentionCutoffIso();
  const { error } = await createAdminClient()
    .from('recent_activities')
    .delete()
    .eq('site_id', SITE_ID)
    .lt('created_at', cutoff);

  if (error) {
    console.warn('[activity-retention] purge failed:', error.message);
    return false;
  }
  return true;
}

/**
 * Fire-and-forget purge at most once per hour per server instance.
 * Queries already filter by retention cutoff, so reads stay correct without purge.
 */
export function schedulePurgeExpiredRecentActivities() {
  const now = Date.now();
  if (now - lastPurgeAttemptAt < PURGE_INTERVAL_MS) return;
  lastPurgeAttemptAt = now;
  void purgeExpiredRecentActivities();
}

/** ISO timestamp for queries that should only return non-expired rows. */
export function recentActivityRetentionCutoffIso() {
  return retentionCutoffIso();
}
