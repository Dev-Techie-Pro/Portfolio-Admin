const store = new Map();

function cacheKey(key) {
  return String(key);
}

/**
 * In-memory TTL cache for CMS read paths (per Node process).
 * Reduces repeated Supabase reads within the same server instance.
 */
export function getCached(key, ttlMs, loader) {
  const k = cacheKey(key);
  const now = Date.now();
  const hit = store.get(k);

  if (hit && hit.expiresAt > now) {
    if (hit.pending) return hit.pending;
    if ('value' in hit) return hit.value;
  }

  const pending = hit?.pending;
  if (pending) return pending;

  const promise = Promise.resolve().then(loader).then((value) => {
    store.set(k, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }).catch((err) => {
    store.delete(k);
    throw err;
  });

  store.set(k, { pending: promise, expiresAt: now + ttlMs });
  return promise;
}

export function invalidateCache(key) {
  store.delete(cacheKey(key));
}

export function invalidateCachePrefix(prefix) {
  const p = cacheKey(prefix);
  for (const key of store.keys()) {
    if (key === p || key.startsWith(`${p}:`)) store.delete(key);
  }
}

/** Drop all CMS list caches after a mutation. */
export function invalidateCmsReadCaches() {
  invalidateCachePrefix('cms');
  invalidateCache('cms:dashboard-stats');
  try {
    // Lazy import avoids circular dependency at module load.
    import('./dashboard-stats').then((mod) => {
      mod.scheduleDashboardStatsRefresh?.();
    }).catch(() => {});
  } catch {
    // ignore
  }
}

export const CMS_CACHE_TTL = {
  recentActivities: 30 * 1000,
  notifications: 45 * 1000,
  lists: 3 * 60 * 1000,
  settings: 5 * 60 * 1000,
};
