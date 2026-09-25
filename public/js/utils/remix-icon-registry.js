const REMIXICON_VERSION = "4.6.0";
const GLYPH_URL = `https://cdn.jsdelivr.net/npm/remixicon@${REMIXICON_VERSION}/fonts/remixicon.glyph.json`;
const TAGS_URL = "https://raw.githubusercontent.com/Remix-Design/RemixIcon/master/tags.json";
const CACHE_KEY = "pa_remixicon_registry_v1";
let registryPromise = null;
let cachedIcons = null;
function humanize(name) {
  return name.replace(/-(line|fill)$/, "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function baseIconName(name) {
  return name.replace(/-(line|fill)$/, "");
}
function buildCategoryMap(tags) {
  const map = /* @__PURE__ */ new Map();
  Object.entries(tags || {}).forEach(([category, icons]) => {
    if (category === "_comment" || !icons || typeof icons !== "object") return;
    Object.entries(icons).forEach(([name, tagStr]) => {
      const entry = map.get(name) || { categories: /* @__PURE__ */ new Set(), aliases: /* @__PURE__ */ new Set() };
      entry.categories.add(category);
      String(tagStr || "").split(",").map((t) => t.trim()).filter(Boolean).forEach((t) => entry.aliases.add(t));
      map.set(name, entry);
    });
  });
  return map;
}
function normalizeRegistry(glyphs, tags) {
  const categoryMap = buildCategoryMap(tags);
  return Object.keys(glyphs || {}).map((name) => {
    const base = baseIconName(name);
    const meta = categoryMap.get(base) || categoryMap.get(name);
    const categories = meta ? Array.from(meta.categories) : ["Other"];
    const aliases = meta ? Array.from(meta.aliases) : [];
    const style = name.endsWith("-fill") ? "fill" : name.endsWith("-line") ? "line" : "";
    return {
      slug: `ri-${name}`,
      name,
      title: humanize(name),
      style,
      aliases,
      categories
    };
  }).sort((a, b) => a.slug.localeCompare(b.slug));
}
function readSessionCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
function writeSessionCache(icons) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(icons));
  } catch {
  }
}
async function fetchRegistry() {
  const [glyphRes, tagsRes] = await Promise.all([
    fetch(GLYPH_URL),
    fetch(TAGS_URL)
  ]);
  if (!glyphRes.ok) throw new Error(`Remix glyph fetch failed (${glyphRes.status})`);
  const glyphs = await glyphRes.json();
  const tags = tagsRes.ok ? await tagsRes.json() : {};
  return normalizeRegistry(glyphs, tags);
}
async function loadRegistry() {
  if (cachedIcons) return cachedIcons;
  const sessionCached = readSessionCache();
  if (sessionCached?.length) {
    cachedIcons = sessionCached;
    return cachedIcons;
  }
  if (!registryPromise) {
    registryPromise = fetchRegistry().then((icons) => {
      cachedIcons = icons;
      writeSessionCache(icons);
      return icons;
    }).catch((err) => {
      registryPromise = null;
      throw err;
    });
  }
  return registryPromise;
}
function searchRegistryIcons(icons, query = "") {
  const q = query.trim().toLowerCase();
  if (!q) return icons;
  return icons.filter((icon) => {
    if (icon.slug.includes(q)) return true;
    if (icon.name.includes(q)) return true;
    if (icon.title.toLowerCase().includes(q)) return true;
    if (icon.style.includes(q)) return true;
    if (icon.aliases.some((alias) => alias.toLowerCase().includes(q))) return true;
    if (icon.categories.some((cat) => cat.toLowerCase().includes(q))) return true;
    return false;
  });
}
function getRegistryCategories(icons) {
  const counts = /* @__PURE__ */ new Map();
  icons.forEach((icon) => {
    icon.categories.forEach((cat) => {
      counts.set(cat, (counts.get(cat) || 0) + 1);
    });
  });
  return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([name, count]) => ({ name, count }));
}
function filterRegistryIcons(icons, { query = "", category = "all" } = {}) {
  let result = icons;
  if (category && category !== "all") {
    result = result.filter((icon) => icon.categories.includes(category));
  }
  if (query.trim()) {
    result = searchRegistryIcons(result, query);
  }
  return result;
}
function getRegistryIcon(icons, slug) {
  if (!slug) return null;
  const normalized = slug.startsWith("ri-") ? slug : `ri-${slug}`;
  return icons.find((icon) => icon.slug === normalized) || null;
}
export {
  filterRegistryIcons,
  getRegistryCategories,
  getRegistryIcon,
  loadRegistry,
  searchRegistryIcons
};
