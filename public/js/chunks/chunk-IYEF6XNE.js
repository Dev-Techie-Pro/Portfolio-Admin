import {
  renderIconPreviewHtml,
  resolveIconKey
} from "./chunk-JUAPOJ2G.js";
import {
  $id
} from "./chunk-R5CPOL4O.js";

// client/utils/remix-icon-registry.ts
var REMIXICON_VERSION = "4.6.0";
var GLYPH_URL = `https://cdn.jsdelivr.net/npm/remixicon@${REMIXICON_VERSION}/fonts/remixicon.glyph.json`;
var TAGS_URL = "https://raw.githubusercontent.com/Remix-Design/RemixIcon/master/tags.json";
var CACHE_KEY = "pa_remixicon_registry_v1";
var registryPromise = null;
var cachedIcons = null;
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

// client/utils/SvgIconPicker.ts
var OVERLAY_ID = "paIconPickerOverlay";
var BATCH_SIZE = 120;
var MAX_PREFILL = 480;
var modalReady = false;
var overlay = null;
var grid = null;
var searchInput = null;
var categorySelect = null;
var countEl = null;
var loadingEl = null;
var errorEl = null;
var emptyEl = null;
var onSelectCb = null;
var currentIcon = "";
var defaultIcon = "ri-tools-line";
var currentCategory = "all";
var renderToken = 0;
var allIcons = [];
var filteredIcons = [];
var renderedCount = 0;
var scrollBound = false;
var returnFocusEl = null;
function setLoading(loading) {
  loadingEl?.classList.toggle("visible", loading);
}
function setError(message) {
  if (!errorEl) return;
  const text = $id("paIconPickerErrorText");
  if (text) text.textContent = message;
  errorEl.hidden = !message;
  if (message) {
    grid.innerHTML = "";
    emptyEl.hidden = true;
  }
}
function populateCategoryFilter() {
  if (!categorySelect) return;
  const categories = getRegistryCategories(allIcons);
  const previous = currentCategory;
  categorySelect.innerHTML = `<option value="all">All categories (${allIcons.length.toLocaleString()})</option>`;
  categories.forEach(({ name, count }) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = `${name} (${count.toLocaleString()})`;
    categorySelect.appendChild(option);
  });
  categorySelect.value = categories.some((cat) => cat.name === previous) ? previous : "all";
  currentCategory = categorySelect.value;
}
function ensureModal() {
  if (modalReady) return;
  overlay = $id(OVERLAY_ID);
  if (!overlay) {
    throw new Error("Icon picker modal markup is missing from the page.");
  }
  grid = $id("paIconPickerGrid");
  searchInput = $id("paIconPickerSearch");
  categorySelect = $id("paIconPickerCategory");
  countEl = $id("paIconPickerCount");
  loadingEl = $id("paIconPickerLoading");
  errorEl = $id("paIconPickerError");
  emptyEl = $id("paIconPickerEmpty");
  $id("paIconPickerClose")?.addEventListener("click", close);
  $id("paIconPickerCancel")?.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  $id("paIconPickerModal")?.addEventListener("click", (e) => e.stopPropagation());
  searchInput?.addEventListener("input", () => {
    resetGrid();
  });
  categorySelect?.addEventListener("change", () => {
    currentCategory = categorySelect.value || "all";
    resetGrid();
  });
  document.addEventListener("keydown", onDocumentKeydown);
  if (!scrollBound && grid) {
    grid.addEventListener("scroll", onGridScroll);
    scrollBound = true;
  }
  modalReady = true;
}
function onDocumentKeydown(e) {
  if (!overlay?.classList.contains("visible")) return;
  if (e.key === "Escape") {
    e.preventDefault();
    close();
  }
}
function restoreFocus() {
  const target = returnFocusEl;
  returnFocusEl = null;
  if (target && typeof target.focus === "function" && document.contains(target)) {
    target.focus();
    return;
  }
  const active = document.activeElement;
  if (active && overlay?.contains(active) && typeof active.blur === "function") {
    active.blur();
  }
}
function openModal() {
  if (!overlay) return;
  overlay.removeAttribute("inert");
  overlay.removeAttribute("aria-hidden");
  overlay.classList.add("visible");
}
function closeModal() {
  if (!overlay) return;
  overlay.classList.remove("visible");
  restoreFocus();
  requestAnimationFrame(() => {
    if (!overlay.classList.contains("visible")) {
      overlay.setAttribute("inert", "");
    }
  });
}
function updateCount() {
  if (!countEl) return;
  const query = searchInput?.value?.trim() || "";
  const categoryLabel = currentCategory === "all" ? "all categories" : currentCategory;
  if (!allIcons.length) {
    countEl.textContent = "";
    return;
  }
  const total = filteredIcons.length;
  const shown = Math.min(renderedCount, total);
  const parts = [`Showing ${shown.toLocaleString()} of ${total.toLocaleString()} icon${total === 1 ? "" : "s"}`];
  if (query) parts.push(`matching "${query}"`);
  if (currentCategory !== "all") parts.push(`in ${categoryLabel}`);
  if (shown < total) parts.push("\u2014 scroll for more");
  countEl.textContent = parts.join(" ");
}
function createIconButton(icon) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "pa-icon-picker-item";
  btn.dataset.icon = icon.slug;
  btn.title = icon.title;
  btn.setAttribute("role", "option");
  btn.setAttribute("aria-label", icon.title);
  btn.innerHTML = `<i class="${icon.slug}" aria-hidden="true"></i>`;
  btn.addEventListener("click", () => selectIcon(icon.slug));
  return btn;
}
function highlightCurrent() {
  if (!grid) return;
  grid.querySelectorAll(".pa-icon-picker-item").forEach((btn) => {
    const active = btn.dataset.icon === currentIcon;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", String(active));
  });
  const activeBtn = grid.querySelector(`.pa-icon-picker-item[data-icon="${CSS.escape(currentIcon)}"]`);
  if (activeBtn) activeBtn.scrollIntoView({ block: "nearest", inline: "nearest" });
}
function appendBatch(token) {
  if (token !== renderToken || !grid) return false;
  const frag = document.createDocumentFragment();
  const start = renderedCount;
  const end = Math.min(renderedCount + BATCH_SIZE, filteredIcons.length);
  for (; renderedCount < end; renderedCount += 1) {
    frag.appendChild(createIconButton(filteredIcons[renderedCount]));
  }
  if (start === renderedCount) return false;
  grid.appendChild(frag);
  emptyEl.hidden = filteredIcons.length > 0;
  updateCount();
  highlightCurrent();
  return renderedCount < filteredIcons.length;
}
function gridNeedsMoreIcons() {
  if (!grid || renderedCount >= filteredIcons.length) return false;
  if (renderedCount >= MAX_PREFILL) return false;
  return grid.scrollHeight <= grid.clientHeight + 16;
}
function fillGridUntilScrollable(token) {
  if (token !== renderToken || !grid) return;
  if (!gridNeedsMoreIcons()) return;
  appendBatch(token);
  requestAnimationFrame(() => fillGridUntilScrollable(token));
}
function onGridScroll() {
  if (!grid) return;
  if (renderedCount >= filteredIcons.length) return;
  if (grid.scrollTop + grid.clientHeight < grid.scrollHeight - 80) return;
  appendBatch(renderToken);
}
function resetGrid() {
  const token = ++renderToken;
  if (!grid) return;
  grid.innerHTML = "";
  renderedCount = 0;
  filteredIcons = filterRegistryIcons(allIcons, {
    query: searchInput?.value || "",
    category: currentCategory
  });
  if (!filteredIcons.length) {
    emptyEl.hidden = false;
    updateCount();
    return;
  }
  emptyEl.hidden = true;
  grid.scrollTop = 0;
  appendBatch(token);
  requestAnimationFrame(() => fillGridUntilScrollable(token));
}
async function loadIcons() {
  setLoading(true);
  setError("");
  try {
    allIcons = await loadRegistry();
    populateCategoryFilter();
    resetGrid();
  } catch {
    setError("Could not load Remix Icon library. Check your connection and try again.");
    if (countEl) countEl.textContent = "";
  } finally {
    setLoading(false);
  }
}
function selectIcon(slug) {
  currentIcon = slug;
  onSelectCb?.(slug);
  close();
}
function close() {
  if (!overlay) return;
  closeModal();
  onSelectCb = null;
}
function open({ current, defaultIcon: fallback, onSelect, returnFocus } = {}) {
  ensureModal();
  defaultIcon = fallback || "ri-tools-line";
  currentIcon = resolveIconKey(current, defaultIcon);
  onSelectCb = onSelect;
  currentCategory = "all";
  returnFocusEl = returnFocus || document.activeElement;
  if (searchInput) searchInput.value = "";
  if (categorySelect) categorySelect.value = "all";
  openModal();
  setTimeout(() => {
    searchInput?.focus();
    fillGridUntilScrollable(renderToken);
  }, 120);
  if (!allIcons.length) {
    void loadIcons();
  } else {
    populateCategoryFilter();
    resetGrid();
  }
}
function updateIconTrigger(prefix, iconKey, fallback = "ri-tools-line") {
  const key = resolveIconKey(iconKey, fallback);
  const hidden = document.getElementById(`${prefix}Icon`);
  if (hidden) hidden.value = key;
  const preview = document.getElementById(`${prefix}IconPreview`);
  if (preview) preview.innerHTML = renderIconPreviewHtml(key, fallback);
  const label = document.getElementById(`${prefix}IconLabel`);
  if (label) label.textContent = key;
}

export {
  open,
  updateIconTrigger
};
