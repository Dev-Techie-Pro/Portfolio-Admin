const REGISTRY_URL = 'https://thesvg.org/api/registry.json';
const REGISTRY_CDN_URL = 'https://cdn.jsdelivr.net/gh/glincker/thesvg@main/src/data/icons.json';
const SVG_CDN_BASE = 'https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons';
const SVG_ORIGIN_BASE = 'https://thesvg.org/icons';
const CACHE_KEY = 'pa_thesvg_registry_v1';

let registryPromise = null;
let cachedIcons = null;

export function getSvgUrl(slug, variant = 'default', preferCdn = true) {
  const safe = String(slug || '').trim();
  if (!safe) return '';
  const base = preferCdn ? SVG_CDN_BASE : SVG_ORIGIN_BASE;
  return `${base}/${encodeURIComponent(safe)}/${variant}.svg`;
}

function normalizeRegistry(data) {
  const icons = Array.isArray(data?.icons) ? data.icons : [];
  return icons
    .filter((icon) => icon?.slug)
    .map((icon) => ({
      slug: icon.slug,
      title: icon.title || icon.slug,
      aliases: Array.isArray(icon.aliases) ? icon.aliases : [],
      categories: Array.isArray(icon.categories) ? icon.categories : [],
      hex: icon.hex || '',
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function readSessionCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionCache(icons) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(icons));
  } catch {
    // Ignore quota errors — registry will be refetched next session.
  }
}

async function fetchRegistryJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Registry fetch failed (${res.status})`);
  const data = await res.json();
  return normalizeRegistry(data);
}

export async function loadRegistry() {
  if (cachedIcons) return cachedIcons;

  const sessionCached = readSessionCache();
  if (sessionCached?.length) {
    cachedIcons = sessionCached;
    return cachedIcons;
  }

  if (!registryPromise) {
    registryPromise = fetchRegistryJson(REGISTRY_URL)
      .catch(() => fetchRegistryJson(REGISTRY_CDN_URL))
      .then((icons) => {
        cachedIcons = icons;
        writeSessionCache(icons);
        return icons;
      })
      .catch((err) => {
        registryPromise = null;
        throw err;
      });
  }

  return registryPromise;
}

export function searchRegistryIcons(icons, query = '') {
  const q = query.trim().toLowerCase();
  if (!q) return icons;
  return icons.filter((icon) => {
    if (icon.slug.includes(q)) return true;
    if (icon.title.toLowerCase().includes(q)) return true;
    if (icon.aliases.some((alias) => alias.toLowerCase().includes(q))) return true;
    if (icon.categories.some((cat) => cat.toLowerCase().includes(q))) return true;
    return false;
  });
}

export function getRegistryCategories(icons) {
  const counts = new Map();
  icons.forEach((icon) => {
    icon.categories.forEach((cat) => {
      counts.set(cat, (counts.get(cat) || 0) + 1);
    });
  });
  return Array.from(counts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));
}

export function filterRegistryIcons(icons, { query = '', category = 'all' } = {}) {
  let result = icons;
  if (category && category !== 'all') {
    result = result.filter((icon) => icon.categories.includes(category));
  }
  if (query.trim()) {
    result = searchRegistryIcons(result, query);
  }
  return result;
}

export function getRegistryIcon(icons, slug) {
  if (!slug) return null;
  return icons.find((icon) => icon.slug === slug) || null;
}
