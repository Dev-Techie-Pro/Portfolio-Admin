/**
 * IndexedDB cache for CMS data — survives full page reloads.
 * Used with stale-while-revalidate in StorageService.
 */

const DB_NAME = 'pa_portfolio_cache_v1';
const DB_VERSION = 1;
const STORE_NAME = 'entries';

/** TTL per storage key (ms). Stale entries are still served; background refresh updates them. */
export const CACHE_TTL_MS = {
  pa_recent_activities: 30 * 1000,
  pa_category_meta: 15 * 60 * 1000,
  pa_technologies: 15 * 60 * 1000,
  pa_project_tags: 15 * 60 * 1000,
  pa_tool_categories: 15 * 60 * 1000,
  pa_blog_categories: 15 * 60 * 1000,
  pa_settings: 10 * 60 * 1000,
  default: 5 * 60 * 1000,
};

export function getTtlForKey(key) {
  return CACHE_TTL_MS[key] ?? CACHE_TTL_MS.default;
}

export function isEntryStale(fetchedAt, key) {
  if (!fetchedAt) return true;
  return Date.now() - fetchedAt > getTtlForKey(key);
}

class PersistentCache {
  constructor() {
    this._dbPromise = null;
  }

  _openDb() {
    if (this._dbPromise) return this._dbPromise;

    this._dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB unavailable'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this._dbPromise;
  }

  async get(key) {
    try {
      const db = await this._openDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => {
          const row = request.result;
          if (!row || row.value === undefined) {
            resolve(null);
            return;
          }
          resolve({ value: row.value, fetchedAt: row.fetchedAt || 0 });
        };
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.warn(`[PersistentCache] get("${key}") failed:`, err);
      return null;
    }
  }

  async getMany(keys) {
    const out = {};
    await Promise.all(keys.map(async (key) => {
      const entry = await this.get(key);
      if (entry) out[key] = entry;
    }));
    return out;
  }

  async set(key, value, fetchedAt = Date.now()) {
    try {
      const db = await this._openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.objectStore(STORE_NAME).put({ key, value, fetchedAt });
      });
    } catch (err) {
      console.warn(`[PersistentCache] set("${key}") failed:`, err);
    }
  }

  async setMany(entries, fetchedAt = Date.now()) {
    if (!entries.length) return;
    try {
      const db = await this._openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        const store = tx.objectStore(STORE_NAME);
        entries.forEach(({ key, value, fetchedAt: ts }) => {
          if (value === null || value === undefined) return;
          store.put({ key, value, fetchedAt: ts ?? fetchedAt });
        });
      });
    } catch (err) {
      console.warn('[PersistentCache] setMany failed:', err);
    }
  }

  async delete(key) {
    try {
      const db = await this._openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.objectStore(STORE_NAME).delete(key);
      });
    } catch (err) {
      console.warn(`[PersistentCache] delete("${key}") failed:`, err);
    }
  }

  async clear() {
    try {
      const db = await this._openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.objectStore(STORE_NAME).clear();
      });
    } catch (err) {
      console.warn('[PersistentCache] clear failed:', err);
    }
  }
}

export const persistentCache = new PersistentCache();
