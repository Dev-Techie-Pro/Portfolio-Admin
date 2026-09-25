import { createAdminClient } from '@/lib/supabase/admin';
import { SITE_ID } from './constants';
import { getCached, CMS_CACHE_TTL, invalidateCache } from './server-cache';

const CACHE_KEY = 'cms:dashboard-stats';

let refreshTimer = null;

/** Debounced refresh after CMS writes. */
export function scheduleDashboardStatsRefresh() {
  if (refreshTimer) return;
  refreshTimer = setTimeout(async () => {
    refreshTimer = null;
    try {
      await createAdminClient().rpc('pa_refresh_dashboard_stats', { p_site_id: SITE_ID });
      invalidateCache(CACHE_KEY);
    } catch (err) {
      console.error('[dashboard-stats] refresh failed:', err);
    }
  }, 2000);
}

export async function getDashboardStats({ fresh = false } = {}) {
  if (fresh) {
    const { error } = await createAdminClient().rpc('pa_refresh_dashboard_stats', {
      p_site_id: SITE_ID,
    });
    if (error) throw error;
    invalidateCache(CACHE_KEY);
  }

  return getCached(CACHE_KEY, CMS_CACHE_TTL.settings, async () => {
    const { data, error } = await createAdminClient()
      .from('site_dashboard_stats')
      .select('*')
      .eq('site_id', SITE_ID)
      .maybeSingle();
    if (error) throw error;
    if (data) return data;

    await createAdminClient().rpc('pa_refresh_dashboard_stats', { p_site_id: SITE_ID });
    const { data: seeded, error: retryError } = await createAdminClient()
      .from('site_dashboard_stats')
      .select('*')
      .eq('site_id', SITE_ID)
      .maybeSingle();
    if (retryError) throw retryError;
    return seeded;
  });
}
