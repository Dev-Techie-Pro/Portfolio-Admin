import { writeAppearanceCache } from '../utils/appearanceCache.js';
import { persistentCache, isEntryStale } from './PersistentCache.js';
import { eventBus } from './EventBus.js';

export class StorageQuotaError extends Error {
  constructor(key, detail) {
    super(detail || `Storage request failed for "${key}"`);
    this.name = 'StorageQuotaError';
    this.key = key;
  }
}

/** Maps legacy IndexedDB keys to Next.js API routes backed by Supabase. */
const MEDIA_LINKED_KEYS = [
  'pa_projects',
  'pa_blog_posts',
  'pa_testimonials',
  'pa_tools',
  'pa_contact_messages',
];

const REMOTE_ROUTES = {
  pa_projects: '/api/projects',
  pa_category_meta: '/api/categories',
  pa_technologies: '/api/technologies',
  pa_media_library: '/api/media',
  pa_testimonials: '/api/testimonials',
  pa_blog_posts: '/api/blog-posts?full=1',
  pa_experience: '/api/experience',
  pa_contact_messages: '/api/contact-messages?all=1',
  pa_recent_activities: '/api/recent-activities',
  pa_tools: '/api/tools',
  pa_tool_categories: '/api/tool-categories',
  pa_blog_categories: '/api/blog-categories',
  pa_project_tags: '/api/tags',
  pa_settings: '/api/settings',
  appearance_settings_v2: '/api/appearance',
  pa_msg_column_visibility: '/api/preferences/contact-columns',
  pa_notification_preferences: '/api/notification-preferences',
  pa_notifications: '/api/notifications',
};

export class StorageService {
  constructor() {
    this._cache = new Map();
    this._meta = new Map();
    this._inflight = new Map();
    this._revalidating = new Set();
    this._readyPromise = Promise.resolve();
    this._bootstrapPromise = null;
  }

  isBootstrapPending() {
    const bag = typeof window !== 'undefined' ? window.__paPrefetch : null;
    const pending = bag?.__bootstrap;
    return !!(pending && typeof pending.then === 'function');
  }

  /** Wait for the cold-load bootstrap request to finish and persist fresh data. */
  async waitForBootstrap() {
    if (!this.isBootstrapPending() && !this._bootstrapPromise) return;
    await this._ensureBootstrapHydrated();
  }

  async _persist(key, value, fetchedAt = Date.now()) {
    this._cache.set(key, value);
    this._meta.set(key, fetchedAt);
    if (key === 'appearance_settings_v2') writeAppearanceCache(value);
    await persistentCache.set(key, value, fetchedAt);
  }

  async _persistBootstrapPayload(payload) {
    if (!payload) return;
    const fetchedAt = payload.fetchedAt ? Date.parse(payload.fetchedAt) : Date.now();
    const entries = Object.entries(payload.data || {})
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => ({ key, value, fetchedAt }));

    if (payload.appearance !== null && payload.appearance !== undefined) {
      entries.push({ key: 'appearance_settings_v2', value: payload.appearance, fetchedAt });
    }

    entries.forEach(({ key, value }) => {
      this._cache.set(key, value);
      this._meta.set(key, fetchedAt);
      if (key === 'appearance_settings_v2') writeAppearanceCache(value);
    });

    await persistentCache.setMany(entries, fetchedAt);
  }

  async _ensureBootstrapHydrated() {
    const bag = typeof window !== 'undefined' ? window.__paPrefetch : null;
    const pending = bag?.__bootstrap;
    if (!pending || typeof pending.then !== 'function') return;

    if (!this._bootstrapPromise) {
      this._bootstrapPromise = pending
        .then(async (payload) => {
          if (!payload) return;
          Object.entries(payload.data || {}).forEach(([key, value]) => {
            if (value !== null && value !== undefined) this._cache.set(key, value);
          });
          if (payload.appearance !== null && payload.appearance !== undefined) {
            this._cache.set('appearance_settings_v2', payload.appearance);
            writeAppearanceCache(payload.appearance);
          }
          if (payload.session) window.__paBootstrapSession = payload.session;
          if (payload.profile) window.__paBootstrapProfile = payload.profile;
          await this._persistBootstrapPayload(payload);
          delete bag.__bootstrap;
        })
        .catch(() => {});
    }

    await this._bootstrapPromise;
  }

  /** Load cached CMS data from IndexedDB into memory before page modules run. */
  async hydrateFromPersistentCache(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    if (!list.length) return;

    const entries = await persistentCache.getMany(list);
    Object.entries(entries).forEach(([key, entry]) => {
      if (entry.value === null || entry.value === undefined) return;
      this._cache.set(key, entry.value);
      this._meta.set(key, entry.fetchedAt || 0);
      if (key === 'appearance_settings_v2') writeAppearanceCache(entry.value);
    });
  }

  _scheduleRevalidate(key, route, fallback) {
    if (!route) return;
    if (this.isBootstrapPending()) return;
    if (this._revalidating.has(key)) return;

    const fetchedAt = this._meta.get(key);
    if (fetchedAt && !isEntryStale(fetchedAt, key)) return;

    this._revalidating.add(key);
    this._fetchRemote(key, route, fallback, { background: true })
      .catch(() => {})
      .finally(() => this._revalidating.delete(key));
  }

  ready() {
    return this._readyPromise;
  }

  /** Fire-and-forget parallel warm-up for one or more keys. */
  prefetch(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    list.forEach((key) => {
      if (this._cache.has(key) || this._inflight.has(key)) return;
      this.get(key).catch(() => {});
    });
  }

  _consumeBootPrefetch(key) {
    const bag = typeof window !== 'undefined' ? window.__paPrefetch : null;
    const pending = bag?.[key];
    if (!pending || typeof pending.then !== 'function') return null;
    delete bag[key];
    return pending;
  }

  async _fetchRemote(key, route, fallback, { background = false } = {}) {
    try {
      const res = await fetch(route, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      if (res.status === 401) {
        if (!background) window.location.href = '/login';
        return fallback;
      }
      if (!res.ok) throw new Error(await res.text());
      const value = await res.json();
      if (value === null || value === undefined) return fallback;
      await this._persist(key, value);
      return value;
    } catch (err) {
      if (!background) {
        console.warn(`[StorageService] get("${key}") failed, using fallback:`, err);
      }
      return fallback;
    }
  }

  async get(key, fallback = null) {
    const route = REMOTE_ROUTES[key];
    if (!route) {
      console.warn(`[StorageService] unknown key "${key}"`);
      return fallback;
    }

    if (this._cache.has(key)) {
      this._scheduleRevalidate(key, route, fallback);
      return this._cache.get(key);
    }

    if (this._inflight.has(key)) return this._inflight.get(key);

    const request = (async () => {
      const persisted = await persistentCache.get(key);
      if (persisted?.value !== null && persisted?.value !== undefined) {
        this._cache.set(key, persisted.value);
        this._meta.set(key, persisted.fetchedAt || 0);
        if (key === 'appearance_settings_v2') writeAppearanceCache(persisted.value);
        this._scheduleRevalidate(key, route, fallback);
        return persisted.value;
      }

      await this._ensureBootstrapHydrated();
      if (this._cache.has(key)) {
        this._scheduleRevalidate(key, route, fallback);
        return this._cache.get(key);
      }

      const bootPrefetch = this._consumeBootPrefetch(key);
      if (bootPrefetch) {
        try {
          const value = await bootPrefetch;
          if (value !== null && value !== undefined) {
            await this._persist(key, value);
            return value;
          }
        } catch {
          /* fall through to network */
        }
      }

      return this._fetchRemote(key, route, fallback);
    })();

    this._inflight.set(key, request);
    try {
      return await request;
    } finally {
      this._inflight.delete(key);
    }
  }

  async set(key, value) {
    const route = REMOTE_ROUTES[key];
    if (!route) throw new Error(`Unknown storage key: ${key}`);

    this._cache.set(key, value);
    if (key === 'appearance_settings_v2') writeAppearanceCache(value);
    try {
      const res = await fetch(route, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(value),
        credentials: 'same-origin',
      });
      if (res.status === 401) {
        window.location.href = '/login';
        throw new StorageQuotaError(key);
      }
      const raw = await res.text();
      if (!res.ok) {
        let detail = raw;
        try {
          const parsed = JSON.parse(raw);
          detail = parsed.error || raw;
        } catch {
          /* use raw body */
        }
        throw new StorageQuotaError(key, detail);
      }

      let payload = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        payload = null;
      }

      if (key === 'pa_projects' || key === 'pa_blog_posts') {
        this.invalidate('pa_media_library');
      } else if (key === 'pa_media_library' && payload?.propagation?.changed) {
        MEDIA_LINKED_KEYS.forEach((linkedKey) => this.invalidate(linkedKey));
      }

      await this._persist(key, value);
    } catch (err) {
      this._cache.delete(key);
      this._meta.delete(key);
      throw err instanceof StorageQuotaError ? err : new StorageQuotaError(key, err?.message);
    }
  }

  async remove(key) {
    this._cache.delete(key);
    this._meta.delete(key);
    await persistentCache.delete(key);
    await this.set(key, Array.isArray(await this.get(key, [])) ? [] : {});
  }

  async getMany(keys, fallback = null) {
    const out = {};
    await Promise.all(keys.map(async (k) => { out[k] = await this.get(k, fallback); }));
    return out;
  }

  async setMany(entries) {
    await Promise.all(Object.entries(entries).map(([key, value]) => this.set(key, value)));
  }

  invalidate(key) {
    this._cache.delete(key);
    this._meta.delete(key);
    persistentCache.delete(key).catch(() => {});
    eventBus.emit('storage:invalidated', key);
  }

  clearCache() {
    this._cache.clear();
    this._meta.clear();
  }

  async clearPersistentCache() {
    this.clearCache();
    await persistentCache.clear();
  }
}

export const storage = new StorageService();
