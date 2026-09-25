// client/core/EventBus.ts
var EventBus = class {
  constructor() {
    this._listeners = /* @__PURE__ */ new Map();
    this._owners = /* @__PURE__ */ new Map();
  }
  /**
   * Subscribe to an event.
   * @param {string} event
   * @param {(payload:any)=>void} handler
   * @param {object} [opts]
   * @param {any} [opts.owner] Optional owner token for bulk unsubscribe.
   * @returns {() => void} unsubscribe function
   */
  on(event, handler, opts = {}) {
    if (typeof handler !== "function") {
      throw new TypeError(`EventBus.on("${event}") requires a function handler`);
    }
    if (!this._listeners.has(event)) this._listeners.set(event, /* @__PURE__ */ new Set());
    this._listeners.get(event).add(handler);
    if (opts.owner) {
      if (!this._owners.has(opts.owner)) this._owners.set(opts.owner, /* @__PURE__ */ new Set());
      this._owners.get(opts.owner).add(() => this.off(event, handler));
    }
    return () => this.off(event, handler);
  }
  /**
   * Subscribe for exactly one invocation.
   * @param {string} event
   * @param {(payload:any)=>void} handler
   * @param {object} [opts]
   */
  once(event, handler, opts = {}) {
    const wrapped = (payload) => {
      this.off(event, wrapped);
      handler(payload);
    };
    return this.on(event, wrapped, opts);
  }
  /**
   * Unsubscribe a specific handler.
   * @param {string} event
   * @param {Function} handler
   */
  off(event, handler) {
    this._listeners.get(event)?.delete(handler);
  }
  /**
   * Emit an event to all subscribers. Handler errors are caught and logged
   * individually so one bad listener can't break the others.
   * @param {string} event
   * @param {any} [payload]
   */
  emit(event, payload) {
    const set = this._listeners.get(event);
    if (!set || set.size === 0) return;
    for (const handler of Array.from(set)) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[EventBus] listener for "${event}" threw:`, err);
      }
    }
  }
  /**
   * Remove every listener registered with a given owner token.
   * Call this from a Module's `destroy()` for automatic cleanup.
   * @param {any} owner
   */
  unsubscribeAll(owner) {
    const cleaners = this._owners.get(owner);
    if (!cleaners) return;
    cleaners.forEach((cleanup) => cleanup());
    this._owners.delete(owner);
  }
  clear() {
    this._listeners.clear();
    this._owners.clear();
  }
};
var eventBus = new EventBus();

// client/utils/customFonts.ts
var MAX_CUSTOM_FONTS = 5;
var MAX_FONT_BYTES = 2 * 1024 * 1024;
var FONT_MIME_TYPES = /* @__PURE__ */ new Set([
  "font/woff",
  "font/woff2",
  "font/ttf",
  "font/otf",
  "application/font-woff",
  "application/font-woff2",
  "application/x-font-woff",
  "application/x-font-ttf",
  "application/x-font-otf",
  "application/octet-stream"
]);
var FONT_EXTENSIONS = {
  woff: "woff",
  woff2: "woff2",
  ttf: "truetype",
  otf: "opentype"
};
var CUSTOM_FONT_STYLE_ID = "pa-custom-fonts-style";
function isCustomFontId(id) {
  return typeof id === "string" && id.startsWith("custom-");
}
function deriveFontFormat(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  return FONT_EXTENSIONS[ext] || "woff2";
}
function deriveFontName(file) {
  const base = file.name.replace(/\.[^.]+$/, "");
  return base.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim().slice(0, 60) || "Custom Font";
}
function deriveFamilyName(displayName) {
  const safe = String(displayName || "Custom Font").replace(/[^\w\s-]/g, "").trim().slice(0, 50) || "Custom Font";
  return `PA Custom ${safe}`;
}
function createCustomFontId() {
  const rand = Math.random().toString(36).slice(2, 8);
  return `custom-${Date.now().toString(36)}${rand}`;
}
function validateFontFile(file) {
  if (!file) return "No file selected.";
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  if (!FONT_EXTENSIONS[ext]) {
    return `"${file.name}" \u2014 only WOFF, WOFF2, TTF, or OTF files are supported.`;
  }
  if (!FONT_MIME_TYPES.has(file.type) && file.type !== "") {
    return `"${file.name}" \u2014 unsupported file type.`;
  }
  if (file.size > MAX_FONT_BYTES) {
    return `"${file.name}" \u2014 file exceeds the 2MB limit.`;
  }
  return null;
}
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read font file."));
    reader.readAsDataURL(file);
  });
}
function normalizeCustomFonts(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((f) => f && isCustomFontId(f.id) && f.url && f.familyName).slice(0, MAX_CUSTOM_FONTS).map((f) => ({
    id: f.id,
    name: String(f.name || f.familyName).slice(0, 60),
    familyName: String(f.familyName).slice(0, 80),
    url: f.url,
    format: f.format || "woff2",
    fileName: typeof f.fileName === "string" ? f.fileName.slice(0, 120) : "",
    uploadedAt: f.uploadedAt || null
  }));
}
function customFontToOption(font) {
  const stack = `'${font.familyName}', sans-serif`;
  return {
    id: font.id,
    name: font.name,
    stack,
    sample: "Your custom typeface",
    isCustom: true
  };
}
function registerCustomFonts(customFonts = []) {
  if (typeof document === "undefined") return;
  let style = document.getElementById(CUSTOM_FONT_STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = CUSTOM_FONT_STYLE_ID;
    document.head.appendChild(style);
  }
  const rules = normalizeCustomFonts(customFonts).map((font) => {
    const format = font.format || "woff2";
    const escapedFamily = font.familyName.replace(/'/g, "\\'");
    const escapedUrl = font.url.replace(/"/g, '\\"');
    return `@font-face{font-family:'${escapedFamily}';src:url("${escapedUrl}") format('${format}');font-display:swap;}`;
  });
  style.textContent = rules.join("\n");
}
async function buildCustomFontFromFile(file) {
  const error = validateFontFile(file);
  if (error) throw new Error(error);
  const url = await readFileAsDataUrl(file);
  const name = deriveFontName(file);
  const familyName = deriveFamilyName(name);
  return {
    id: createCustomFontId(),
    name,
    familyName,
    url,
    format: deriveFontFormat(file),
    fileName: file.name,
    uploadedAt: (/* @__PURE__ */ new Date()).toISOString()
  };
}

// client/utils/googleFonts.ts
var LAYOUT_PRELOADED = /* @__PURE__ */ new Set(["inter", "outfit"]);
var GOOGLE_FONT_SPECS = {
  "plus-jakarta-sans": { family: "Plus+Jakarta+Sans", weights: "300;400;600;700" },
  manrope: { family: "Manrope", weights: "300;400;600;700" },
  figtree: { family: "Figtree", weights: "300;400;600;700" },
  "dm-sans": { family: "DM+Sans", weights: "400;500;600;700" },
  sora: { family: "Sora", weights: "300;400;600;700" },
  "instrument-sans": { family: "Instrument+Sans", weights: "400;500;600;700" },
  "space-grotesk": { family: "Space+Grotesk", weights: "400;500;600;700" },
  onest: { family: "Onest", weights: "300;400;600;700" },
  fraunces: { family: "Fraunces", weights: "400;600;700" },
  "source-serif-4": { family: "Source+Serif+4", weights: "400;600;700" },
  literata: { family: "Literata", weights: "400;600;700" },
  "jetbrains-mono": { family: "JetBrains+Mono", weights: "400;500;700" },
  "ibm-plex-mono": { family: "IBM+Plex+Mono", weights: "400;500;700" },
  "fira-code": { family: "Fira+Code", weights: "400;500;700" },
  "source-code-pro": { family: "Source+Code+Pro", weights: "400;500;700" },
  "dm-mono": { family: "DM+Mono", weights: "400;500" }
};
function ensureGoogleFontLoaded(fontId) {
  if (!fontId || typeof document === "undefined") return;
  if (LAYOUT_PRELOADED.has(fontId) || fontId.startsWith("custom-")) return;
  const spec = GOOGLE_FONT_SPECS[fontId];
  if (!spec) return;
  const linkId = `pa-gf-${fontId}`;
  if (document.getElementById(linkId)) return;
  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${spec.family}:wght@${spec.weights}&display=swap`;
  document.head.appendChild(link);
}

// client/utils/appearanceCache.ts
var APPEARANCE_CACHE_KEY = "pa_appearance_settings_v2";
var APPEARANCE_DEFAULTS = {
  theme: "dark",
  accent: "#ff6600",
  fontSize: "14px",
  fontFamily: "inter",
  fontWeight: "400",
  cornerRadius: "14px",
  cardSpacing: "10px",
  iconSize: "medium",
  customFonts: []
};
var ICON_SIZE_PRESETS = {
  small: {
    nav: "12px",
    action: "14px",
    stat: "18px",
    header: "16px",
    empty: "32px",
    toggle: "14px",
    circle: "38px",
    btn: "34px"
  },
  medium: {
    nav: "14px",
    action: "16px",
    stat: "22px",
    header: "18px",
    empty: "40px",
    toggle: "16px",
    circle: "44px",
    btn: "38px"
  },
  large: {
    nav: "18px",
    action: "20px",
    stat: "26px",
    header: "22px",
    empty: "48px",
    toggle: "20px",
    circle: "52px",
    btn: "44px"
  }
};
var ICON_PREVIEW_SIZES = { small: "12px", medium: "16px", large: "20px" };
var CUSTOM_FONTS = [
  { group: "Sans-serif", fonts: [
    { id: "inter", name: "Inter", stack: "'Inter', sans-serif", sample: "The quick brown fox" },
    { id: "outfit", name: "Outfit", stack: "'Outfit', sans-serif", sample: "Clean and modern" },
    { id: "plus-jakarta-sans", name: "Plus Jakarta Sans", stack: "'Plus Jakarta Sans', sans-serif", sample: "Modern admin dashboard" },
    { id: "manrope", name: "Manrope", stack: "'Manrope', sans-serif", sample: "Clear and balanced" },
    { id: "figtree", name: "Figtree", stack: "'Figtree', sans-serif", sample: "Friendly and professional" },
    { id: "dm-sans", name: "DM Sans", stack: "'DM Sans', sans-serif", sample: "The quick brown fox" },
    { id: "sora", name: "Sora", stack: "'Sora', sans-serif", sample: "Tech-forward clarity" },
    { id: "instrument-sans", name: "Instrument Sans", stack: "'Instrument Sans', sans-serif", sample: "Crisp UI typography" },
    { id: "space-grotesk", name: "Space Grotesk", stack: "'Space Grotesk', sans-serif", sample: "Geometric precision" },
    { id: "onest", name: "Onest", stack: "'Onest', sans-serif", sample: "Designed for interfaces" }
  ] },
  { group: "Serif", fonts: [
    { id: "fraunces", name: "Fraunces", stack: "'Fraunces', serif", sample: "Elegant and literary" },
    { id: "source-serif-4", name: "Source Serif 4", stack: "'Source Serif 4', serif", sample: "Readable long-form text" },
    { id: "literata", name: "Literata", stack: "'Literata', serif", sample: "Warm editorial tone" }
  ] },
  { group: "Monospace", fonts: [
    { id: "jetbrains-mono", name: "JetBrains Mono", stack: "'JetBrains Mono', monospace", sample: "const app = true;" },
    { id: "ibm-plex-mono", name: "IBM Plex Mono", stack: "'IBM Plex Mono', monospace", sample: "function() { }" },
    { id: "fira-code", name: "Fira Code", stack: "'Fira Code', monospace", sample: "const data = [];" },
    { id: "source-code-pro", name: "Source Code Pro", stack: "'Source Code Pro', monospace", sample: "export default {};" },
    { id: "dm-mono", name: "DM Mono", stack: "'DM Mono', monospace", sample: "npm run dev" }
  ] }
];
var FONT_SIZE_MAP = {
  "10px": "10px",
  "14px": "14px",
  "16px": "16px"
};
var FONT_SIZE_TOKEN_BASE = {
  xm: 8,
  sm: 10,
  xmd: 12,
  md: 14,
  lg: 16,
  xl: 22,
  xxl: 42
};
var FONT_WEIGHT_MAP = {
  300: "300",
  400: "400",
  600: "600",
  700: "700"
};
var FONT_WEIGHT_OFFSETS = {
  xs: -200,
  sm: -100,
  md: 0,
  lg: 100,
  xl: 200
};
function clampFontWeight(value) {
  return String(Math.min(900, Math.max(100, value)));
}
function applyFontSizeTokens(root, fontSize) {
  const basePx = parseFloat(FONT_SIZE_MAP[fontSize] || FONT_SIZE_MAP["14px"]);
  const scale = basePx / FONT_SIZE_TOKEN_BASE.md;
  Object.entries(FONT_SIZE_TOKEN_BASE).forEach(([token, px]) => {
    root.style.setProperty(`--pa-fs-${token}`, `${Math.round(px * scale * 100) / 100}px`);
  });
  root.style.fontSize = `${basePx}px`;
  root.dataset.fontSize = fontSize;
}
function applyFontWeightTokens(root, fontWeight) {
  const base = parseInt(FONT_WEIGHT_MAP[fontWeight] || FONT_WEIGHT_MAP["400"], 10);
  Object.entries(FONT_WEIGHT_OFFSETS).forEach(([token, offset]) => {
    root.style.setProperty(`--pa-fw-${token}`, clampFontWeight(base + offset));
  });
  if (document.body) document.body.style.fontWeight = String(base);
  root.dataset.fontWeight = fontWeight;
}
var SPACING_MAP = {
  "5px": "5px",
  "10px": "10px",
  "15px": "15px"
};
var RADIUS_MAP = {
  "0px": { sm: "0px", md: "0px", lg: "0px", xl: "0px" },
  "5px": { sm: "5px", md: "10px", lg: "15px", xl: "20px" },
  "14px": { sm: "8px", md: "15px", lg: "18px", xl: "24px" },
  "25px": { sm: "14px", md: "18px", lg: "20px", xl: "30px" }
};
var ALL_FONT_IDS = CUSTOM_FONTS.flatMap((g) => g.fonts.map((f) => f.id));
var VALID_RADII = Object.keys(RADIUS_MAP);
var VALID_FONT_SIZES = Object.keys(FONT_SIZE_MAP);
function migrateFontSize(size) {
  if (typeof size === "string" && VALID_FONT_SIZES.includes(size)) return size;
  const px = parseFloat(String(size)) || 14;
  if (px <= 11) return "10px";
  if (px <= 15) return "14px";
  return "16px";
}
var VALID_FONT_WEIGHTS = Object.keys(FONT_WEIGHT_MAP);
var VALID_SPACINGS = Object.keys(SPACING_MAP);
var VALID_ICON_SIZES = Object.keys(ICON_SIZE_PRESETS);
function applyIconSizeVariables(root, iconSize) {
  const preset = ICON_SIZE_PRESETS[iconSize] || ICON_SIZE_PRESETS.medium;
  root.style.setProperty("--pa-icon-nav", preset.nav);
  root.style.setProperty("--pa-icon-action", preset.action);
  root.style.setProperty("--pa-icon-stat", preset.stat);
  root.style.setProperty("--pa-icon-header", preset.header);
  root.style.setProperty("--pa-icon-empty", preset.empty);
  root.style.setProperty("--pa-icon-toggle", preset.toggle);
  root.style.setProperty("--pa-icon-circle", preset.circle);
  root.style.setProperty("--pa-icon-btn", preset.btn);
  root.dataset.iconSize = VALID_ICON_SIZES.includes(iconSize) ? iconSize : "medium";
}
function hexToRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)].join(",");
}
function applyAccentCssVariables(root, accent) {
  const hex = /^#[0-9a-fA-F]{6}$/.test(accent) ? accent : APPEARANCE_DEFAULTS.accent;
  const rgb = hexToRgb(hex);
  root.style.setProperty("--pa-orange", hex);
  root.style.setProperty("--pa-orange-rgb", rgb);
  root.style.setProperty("--pa-orange-dim", `rgba(${rgb}, 0.12)`);
  root.style.setProperty("--pa-orange-hover", hex);
  root.style.setProperty("--pa-orange-glow", `rgba(${rgb}, 0.22)`);
  root.style.setProperty("--pa-orange-border", `rgba(${rgb}, 0.28)`);
  root.style.setProperty("--pa-orange-lighter", `rgba(${rgb}, 0.5)`);
}
function isValidFontFamilyId(id, customFonts = []) {
  return ALL_FONT_IDS.includes(id) || customFonts.some((f) => f.id === id);
}
function getFontGroups(customFonts = []) {
  const groups = CUSTOM_FONTS.map((group) => ({ ...group, fonts: [...group.fonts] }));
  const normalized = normalizeCustomFonts(customFonts);
  if (normalized.length) {
    groups.unshift({
      group: "Your Uploads",
      fonts: normalized.map(customFontToOption)
    });
  }
  return groups;
}
function getFontById(id, customFonts = []) {
  for (const g of CUSTOM_FONTS) {
    const f = g.fonts.find((x) => x.id === id);
    if (f) return f;
  }
  const custom = normalizeCustomFonts(customFonts).find((f) => f.id === id);
  if (custom) return customFontToOption(custom);
  return CUSTOM_FONTS[0].fonts[0];
}
function normalizeAppearanceSettings(raw) {
  const settings = { ...APPEARANCE_DEFAULTS, customFonts: [] };
  if (!raw || typeof raw !== "object") return settings;
  if (["light", "dark", "system"].includes(raw.theme)) settings.theme = raw.theme;
  if (/^#[0-9a-fA-F]{6}$/.test(raw.accent)) settings.accent = raw.accent;
  if (raw.fontSize) settings.fontSize = migrateFontSize(raw.fontSize);
  settings.customFonts = normalizeCustomFonts(raw.customFonts);
  if (typeof raw.fontFamily === "string" && isValidFontFamilyId(raw.fontFamily, settings.customFonts)) {
    settings.fontFamily = raw.fontFamily;
  } else if (isCustomFontId(raw.fontFamily)) {
    settings.fontFamily = APPEARANCE_DEFAULTS.fontFamily;
  }
  const weight = String(raw.fontWeight);
  if (VALID_FONT_WEIGHTS.includes(weight)) settings.fontWeight = weight;
  if (typeof raw.cornerRadius === "string" && VALID_RADII.includes(raw.cornerRadius)) {
    settings.cornerRadius = raw.cornerRadius;
  }
  if (VALID_SPACINGS.includes(raw.cardSpacing)) settings.cardSpacing = raw.cardSpacing;
  if (VALID_ICON_SIZES.includes(raw.iconSize)) settings.iconSize = raw.iconSize;
  return settings;
}
function readAppearanceCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(APPEARANCE_CACHE_KEY);
    if (!raw) return null;
    return normalizeAppearanceSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}
function writeAppearanceCache(settings) {
  if (typeof window === "undefined" || !settings) return;
  try {
    localStorage.setItem(APPEARANCE_CACHE_KEY, JSON.stringify(normalizeAppearanceSettings(settings)));
  } catch (err) {
    console.warn("[appearanceCache] could not write localStorage:", err);
  }
}
function applyAppearanceSettings(settings, options = {}) {
  if (!settings || typeof document === "undefined") return;
  const normalized = normalizeAppearanceSettings(settings);
  const systemDark = options.systemDark ?? window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = normalized.theme === "system" ? systemDark : normalized.theme === "dark";
  document.body?.classList.toggle("light", !dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  const root = document.documentElement;
  applyAccentCssVariables(root, normalized.accent);
  applyFontSizeTokens(root, normalized.fontSize);
  registerCustomFonts(normalized.customFonts);
  ensureGoogleFontLoaded(normalized.fontFamily);
  const font = getFontById(normalized.fontFamily, normalized.customFonts);
  if (document.body) document.body.style.fontFamily = font.stack;
  applyFontWeightTokens(root, normalized.fontWeight);
  const radius = RADIUS_MAP[normalized.cornerRadius] || RADIUS_MAP["14px"];
  root.style.setProperty("--pa-radius", normalized.cornerRadius);
  root.style.setProperty("--pa-radius-sm", radius.sm);
  root.style.setProperty("--pa-radius-md", radius.md);
  root.style.setProperty("--pa-radius-lg", radius.lg);
  root.style.setProperty("--pa-radius-xl", radius.xl);
  const spacing = SPACING_MAP[normalized.cardSpacing] || "10px";
  root.style.setProperty("--pa-card-gap", spacing);
  root.dataset.cardSpacing = normalized.cardSpacing;
  applyIconSizeVariables(root, normalized.iconSize);
  eventBus.emit("appearance:updated", { settings: normalized });
  return normalized;
}
function bootstrapAppearanceFromCache() {
  const cached = readAppearanceCache();
  if (cached) applyAppearanceSettings(cached);
  if (typeof window !== "undefined") {
    window.__paWriteAppearanceCache = writeAppearanceCache;
  }
  return cached;
}

// client/core/PersistentCache.ts
var DB_NAME = "pa_portfolio_cache_v1";
var DB_VERSION = 1;
var STORE_NAME = "entries";
var CACHE_TTL_MS = {
  pa_recent_activities: 30 * 1e3,
  pa_category_meta: 15 * 60 * 1e3,
  pa_technologies: 15 * 60 * 1e3,
  pa_project_tags: 15 * 60 * 1e3,
  pa_tool_categories: 15 * 60 * 1e3,
  pa_blog_categories: 15 * 60 * 1e3,
  pa_settings: 10 * 60 * 1e3,
  default: 5 * 60 * 1e3
};
function getTtlForKey(key) {
  return CACHE_TTL_MS[key] ?? CACHE_TTL_MS.default;
}
function isEntryStale(fetchedAt, key) {
  if (!fetchedAt) return true;
  return Date.now() - fetchedAt > getTtlForKey(key);
}
var PersistentCache = class {
  constructor() {
    this._dbPromise = null;
  }
  _openDb() {
    if (this._dbPromise) return this._dbPromise;
    this._dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB unavailable"));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
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
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(key);
        request.onsuccess = () => {
          const row = request.result;
          if (!row || row.value === void 0) {
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
        const tx = db.transaction(STORE_NAME, "readwrite");
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
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        const store = tx.objectStore(STORE_NAME);
        entries.forEach(({ key, value, fetchedAt: ts }) => {
          if (value === null || value === void 0) return;
          store.put({ key, value, fetchedAt: ts ?? fetchedAt });
        });
      });
    } catch (err) {
      console.warn("[PersistentCache] setMany failed:", err);
    }
  }
  async delete(key) {
    try {
      const db = await this._openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
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
        const tx = db.transaction(STORE_NAME, "readwrite");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.objectStore(STORE_NAME).clear();
      });
    } catch (err) {
      console.warn("[PersistentCache] clear failed:", err);
    }
  }
};
var persistentCache = new PersistentCache();

// client/core/StorageService.ts
var StorageQuotaError = class extends Error {
  constructor(key, detail) {
    super(detail || `Storage request failed for "${key}"`);
    this.name = "StorageQuotaError";
    this.key = key;
  }
};
var MEDIA_LINKED_KEYS = [
  "pa_projects",
  "pa_blog_posts",
  "pa_testimonials",
  "pa_tools",
  "pa_contact_messages"
];
var REMOTE_ROUTES = {
  pa_projects: "/api/projects",
  pa_category_meta: "/api/categories",
  pa_technologies: "/api/technologies",
  pa_media_library: "/api/media",
  pa_testimonials: "/api/testimonials",
  pa_blog_posts: "/api/blog-posts?full=1",
  pa_experience: "/api/experience",
  pa_contact_messages: "/api/contact-messages?all=1",
  pa_recent_activities: "/api/recent-activities",
  pa_tools: "/api/tools",
  pa_tool_categories: "/api/tool-categories",
  pa_blog_categories: "/api/blog-categories",
  pa_project_tags: "/api/tags",
  pa_settings: "/api/settings",
  appearance_settings_v2: "/api/appearance",
  pa_msg_column_visibility: "/api/preferences/contact-columns",
  pa_notification_preferences: "/api/notification-preferences",
  pa_notifications: "/api/notifications"
};
var StorageService = class {
  constructor() {
    this._cache = /* @__PURE__ */ new Map();
    this._meta = /* @__PURE__ */ new Map();
    this._inflight = /* @__PURE__ */ new Map();
    this._revalidating = /* @__PURE__ */ new Set();
    this._readyPromise = Promise.resolve();
    this._bootstrapPromise = null;
  }
  isBootstrapPending() {
    const bag = typeof window !== "undefined" ? window.__paPrefetch : null;
    const pending = bag?.__bootstrap;
    return !!(pending && typeof pending.then === "function");
  }
  /** Wait for the cold-load bootstrap request to finish and persist fresh data. */
  async waitForBootstrap() {
    if (!this.isBootstrapPending() && !this._bootstrapPromise) return;
    await this._ensureBootstrapHydrated();
  }
  async _persist(key, value, fetchedAt = Date.now()) {
    this._cache.set(key, value);
    this._meta.set(key, fetchedAt);
    if (key === "appearance_settings_v2") writeAppearanceCache(value);
    await persistentCache.set(key, value, fetchedAt);
  }
  async _persistBootstrapPayload(payload) {
    if (!payload) return;
    const fetchedAt = payload.fetchedAt ? Date.parse(payload.fetchedAt) : Date.now();
    const entries = Object.entries(payload.data || {}).filter(([, value]) => value !== null && value !== void 0).map(([key, value]) => ({ key, value, fetchedAt }));
    if (payload.appearance !== null && payload.appearance !== void 0) {
      entries.push({ key: "appearance_settings_v2", value: payload.appearance, fetchedAt });
    }
    entries.forEach(({ key, value }) => {
      this._cache.set(key, value);
      this._meta.set(key, fetchedAt);
      if (key === "appearance_settings_v2") writeAppearanceCache(value);
    });
    await persistentCache.setMany(entries, fetchedAt);
  }
  async _ensureBootstrapHydrated() {
    const bag = typeof window !== "undefined" ? window.__paPrefetch : null;
    const pending = bag?.__bootstrap;
    if (!pending || typeof pending.then !== "function") return;
    if (!this._bootstrapPromise) {
      this._bootstrapPromise = pending.then(async (payload) => {
        if (!payload) return;
        Object.entries(payload.data || {}).forEach(([key, value]) => {
          if (value !== null && value !== void 0) this._cache.set(key, value);
        });
        if (payload.appearance !== null && payload.appearance !== void 0) {
          this._cache.set("appearance_settings_v2", payload.appearance);
          writeAppearanceCache(payload.appearance);
        }
        if (payload.session) window.__paBootstrapSession = payload.session;
        if (payload.profile) window.__paBootstrapProfile = payload.profile;
        await this._persistBootstrapPayload(payload);
        delete bag.__bootstrap;
      }).catch(() => {
      });
    }
    await this._bootstrapPromise;
  }
  /** Load cached CMS data from IndexedDB into memory before page modules run. */
  async hydrateFromPersistentCache(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    if (!list.length) return;
    const entries = await persistentCache.getMany(list);
    Object.entries(entries).forEach(([key, entry]) => {
      if (entry.value === null || entry.value === void 0) return;
      this._cache.set(key, entry.value);
      this._meta.set(key, entry.fetchedAt || 0);
      if (key === "appearance_settings_v2") writeAppearanceCache(entry.value);
    });
  }
  _scheduleRevalidate(key, route, fallback) {
    if (!route) return;
    if (this.isBootstrapPending()) return;
    if (this._revalidating.has(key)) return;
    const fetchedAt = this._meta.get(key);
    if (fetchedAt && !isEntryStale(fetchedAt, key)) return;
    this._revalidating.add(key);
    this._fetchRemote(key, route, fallback, { background: true }).catch(() => {
    }).finally(() => this._revalidating.delete(key));
  }
  ready() {
    return this._readyPromise;
  }
  /** Fire-and-forget parallel warm-up for one or more keys. */
  prefetch(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    list.forEach((key) => {
      if (this._cache.has(key) || this._inflight.has(key)) return;
      this.get(key).catch(() => {
      });
    });
  }
  _consumeBootPrefetch(key) {
    const bag = typeof window !== "undefined" ? window.__paPrefetch : null;
    const pending = bag?.[key];
    if (!pending || typeof pending.then !== "function") return null;
    delete bag[key];
    return pending;
  }
  async _fetchRemote(key, route, fallback, { background = false } = {}) {
    try {
      const res = await fetch(route, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin"
      });
      if (res.status === 401) {
        if (!background) window.location.href = "/login";
        return fallback;
      }
      if (!res.ok) throw new Error(await res.text());
      const value = await res.json();
      if (value === null || value === void 0) return fallback;
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
      if (persisted?.value !== null && persisted?.value !== void 0) {
        this._cache.set(key, persisted.value);
        this._meta.set(key, persisted.fetchedAt || 0);
        if (key === "appearance_settings_v2") writeAppearanceCache(persisted.value);
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
          if (value !== null && value !== void 0) {
            await this._persist(key, value);
            return value;
          }
        } catch {
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
    if (key === "appearance_settings_v2") writeAppearanceCache(value);
    try {
      const res = await fetch(route, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(value),
        credentials: "same-origin"
      });
      if (res.status === 401) {
        window.location.href = "/login";
        throw new StorageQuotaError(key);
      }
      const raw = await res.text();
      if (!res.ok) {
        let detail = raw;
        try {
          const parsed = JSON.parse(raw);
          detail = parsed.error || raw;
        } catch {
        }
        throw new StorageQuotaError(key, detail);
      }
      let payload = null;
      try {
        payload = raw ? JSON.parse(raw) : null;
      } catch {
        payload = null;
      }
      if (key === "pa_projects" || key === "pa_blog_posts") {
        this.invalidate("pa_media_library");
      } else if (key === "pa_media_library" && payload?.propagation?.changed) {
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
    await Promise.all(keys.map(async (k) => {
      out[k] = await this.get(k, fallback);
    }));
    return out;
  }
  async setMany(entries) {
    await Promise.all(Object.entries(entries).map(([key, value]) => this.set(key, value)));
  }
  invalidate(key) {
    this._cache.delete(key);
    this._meta.delete(key);
    persistentCache.delete(key).catch(() => {
    });
    eventBus.emit("storage:invalidated", key);
  }
  clearCache() {
    this._cache.clear();
    this._meta.clear();
  }
  async clearPersistentCache() {
    this.clearCache();
    await persistentCache.clear();
  }
};
var storage = new StorageService();

// client/utils/dom.ts
var _queryCache = /* @__PURE__ */ new Map();
function $(selector, scope = document) {
  if (scope === document && selector.startsWith("#") && !selector.includes(" ")) {
    return document.getElementById(selector.slice(1));
  }
  return scope.querySelector(selector);
}
function $all(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}
function $id(id) {
  if (_queryCache.has(id)) {
    const cached = _queryCache.get(id);
    if (cached && cached.isConnected) return cached;
    _queryCache.delete(id);
  }
  const el = document.getElementById(id);
  if (el) _queryCache.set(id, el);
  return el;
}
function asFormField(el) {
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
    return el;
  }
  return null;
}
function asHtmlInput(el) {
  return el instanceof HTMLInputElement ? el : null;
}
function asHtmlButton(el) {
  return el instanceof HTMLButtonElement ? el : null;
}
function $field(id) {
  return asFormField($id(id));
}
function $input(id) {
  const el = $id(id);
  return el instanceof HTMLInputElement ? el : null;
}
function $select(id) {
  const el = $id(id);
  return el instanceof HTMLSelectElement ? el : null;
}
function clearDomCache() {
  _queryCache.clear();
}
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str == null ? "" : String(str);
  return div.innerHTML;
}

// client/modules/shell/toast.ts
var TOAST_ICONS = {
  success: "ri-checkbox-circle-line",
  info: "ri-information-line",
  danger: "ri-error-warning-line"
};
function ensureToastWrap() {
  let wrap = document.getElementById("paToastWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "paToastWrap";
    wrap.className = "pa-toast-wrap";
    wrap.setAttribute("role", "status");
    wrap.setAttribute("aria-live", "polite");
    document.body.appendChild(wrap);
    return wrap;
  }
  if (wrap.parentElement !== document.body) {
    document.body.appendChild(wrap);
  }
  return wrap;
}
function showToast(msg, type = "info", duration = 3500) {
  const wrap = ensureToastWrap();
  if (!wrap) {
    console.warn("[toast]", type, msg);
    return;
  }
  const el = document.createElement("div");
  el.className = `pa-toast ${type}`;
  el.innerHTML = `<i class="pa-toast-icon ${TOAST_ICONS[type] || TOAST_ICONS.info}"></i><span>${escapeHtml(msg)}</span><button class="pa-toast-close" aria-label="Dismiss"><i class="ri-close-line"></i></button>`;
  el.querySelector(".pa-toast-close").addEventListener("click", () => removeToast(el));
  wrap.appendChild(el);
  el._timer = setTimeout(() => removeToast(el), duration);
}
function removeToast(el) {
  if (!el || !el.parentElement) return;
  clearTimeout(el._timer);
  el.classList.add("removing");
  setTimeout(() => el.remove(), 200);
}
function clearToasts() {
  const wrap = ensureToastWrap();
  if (!wrap) return;
  wrap.querySelectorAll(".pa-toast").forEach((el) => removeToast(el));
}
function showStatusToast(msg, type = "info", duration = 4500) {
  clearToasts();
  showToast(msg, type, duration);
}

// client/modules/shell/notifications.ts
var notifications = [];
var unreadCount = 0;
var loading = false;
function formatRelativeTime(iso) {
  if (!iso) return "Just now";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 6e4);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}
function maybeShowBrowserNotification(item) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(item.title, {
      body: item.body || "",
      icon: "/favicon.ico",
      tag: item.id
    });
  } catch {
  }
}
function renderNotifications() {
  const list = $id("paNotifList");
  const badge = $id("paNotifBadge");
  if (!list) return;
  if (loading) {
    list.innerHTML = '<div class="pa-notif-empty"><i class="ri-loader-4-line"></i> Loading notifications\u2026</div>';
    return;
  }
  if (notifications.length === 0) {
    list.innerHTML = `<div class="pa-notif-empty"><i class="ri-notification-off-line" style="font-size:24px;display:block;margin-bottom:8px;"></i>No new notifications</div>`;
  } else {
    list.innerHTML = notifications.map(
      (n) => `
      <div class="pa-notif-item${n.read ? " is-read" : ""}" data-notif-id="${escapeHtml(n.id)}"${n.linkPath ? ` data-notif-link="${escapeHtml(n.linkPath)}"` : ""} role="button" tabindex="0">
        <div class="pa-notif-item-icon"><i class="${escapeHtml(n.icon || "ri-information-line")}"></i></div>
        <div>
          <div class="pa-notif-item-text">${escapeHtml(n.title)}</div>
          ${n.body ? `<div class="pa-notif-item-desc">${escapeHtml(n.body)}</div>` : ""}
          <div class="pa-notif-item-time">${escapeHtml(formatRelativeTime(n.createdAt))}</div>
        </div>
      </div>`
    ).join("");
  }
  if (badge) {
    const count = unreadCount || notifications.filter((n) => !n.read).length;
    if (count > 0) {
      badge.textContent = count > 9 ? "9+" : String(count);
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }
}
async function loadNotifications({ silent = false } = {}) {
  if (!silent) {
    loading = true;
    renderNotifications();
  }
  try {
    const payload = await storage.get("pa_notifications", { notifications: [], unreadCount: 0 });
    notifications = Array.isArray(payload?.notifications) ? payload.notifications : [];
    unreadCount = Number(payload?.unreadCount) || notifications.filter((n) => !n.read).length;
  } catch {
    notifications = [];
    unreadCount = 0;
  } finally {
    loading = false;
    renderNotifications();
  }
}
async function addNotification(text, icon, options = {}) {
  const title = String(text || "").trim();
  if (!title) return;
  try {
    const res = await fetch("/api/notifications", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({
        title,
        icon: icon || "ri-information-line",
        body: options.body || null,
        category: options.category || "other",
        linkPath: options.linkPath || null,
        metadata: options.metadata || {}
      })
    });
    const payload = await res.json().catch(() => ({}));
    if (res.ok && payload.notification) {
      notifications = [payload.notification, ...notifications.filter((n) => n.id !== payload.notification.id)];
      unreadCount += payload.notification.read ? 0 : 1;
      storage.invalidate("pa_notifications");
      renderNotifications();
      maybeShowBrowserNotification(payload.notification);
      eventBus.emit("notifications:updated", { notifications, unreadCount });
      return payload.notification;
    }
  } catch {
  }
  const fallback = {
    id: `local-${Date.now()}`,
    title,
    body: options.body || "",
    icon: icon || "ri-information-line",
    read: false,
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    linkPath: options.linkPath || ""
  };
  notifications = [fallback, ...notifications];
  unreadCount += 1;
  renderNotifications();
  return fallback;
}
async function clearNotifications() {
  try {
    await fetch("/api/notifications", {
      method: "DELETE",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ clearAll: true })
    });
    storage.invalidate("pa_notifications");
  } catch {
  }
  notifications = [];
  unreadCount = 0;
  renderNotifications();
  eventBus.emit("notifications:updated", { notifications, unreadCount });
}
async function markNotificationRead(notificationId) {
  if (!notificationId) return;
  try {
    const res = await fetch("/api/notifications", {
      method: "PATCH",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ ids: [notificationId] })
    });
    const payload = await res.json().catch(() => ({}));
    if (res.ok) {
      notifications = payload.notifications || notifications.map((n) => n.id === notificationId ? { ...n, read: true } : n);
      unreadCount = payload.unreadCount ?? notifications.filter((n) => !n.read).length;
      storage.invalidate("pa_notifications");
      renderNotifications();
      eventBus.emit("notifications:updated", { notifications, unreadCount });
    }
  } catch {
  }
}
async function requestBrowserNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

// client/core/StateStore.ts
var StateStore = class {
  /**
   * @param {object} initialState
   */
  constructor(initialState = {}) {
    this._subscribers = /* @__PURE__ */ new Set();
    this._batching = false;
    this._dirtyKeys = /* @__PURE__ */ new Set();
    this._scheduled = false;
    this._raw = { ...initialState };
    this.state = new Proxy(this._raw, {
      set: (target, key, value) => {
        if (target[key] === value) return true;
        const prev = target[key];
        target[key] = value;
        this._dirtyKeys.add(key);
        this._scheduleNotify(prev);
        return true;
      },
      deleteProperty: (target, key) => {
        if (!(key in target)) return true;
        delete target[key];
        this._dirtyKeys.add(key);
        this._scheduleNotify();
        return true;
      }
    });
  }
  get(key) {
    return this._raw[key];
  }
  set(key, value) {
    this.state[key] = value;
    return this;
  }
  update(patch) {
    this.batch(() => {
      Object.entries(patch).forEach(([k, v]) => {
        this.state[k] = v;
      });
    });
    return this;
  }
  /**
   * Run `fn` with notifications suppressed until it returns, then fire once.
   * Nested batches are safe — only the outermost flushes.
   * @param {() => void} fn
   */
  batch(fn) {
    const alreadyBatching = this._batching;
    this._batching = true;
    try {
      fn();
    } finally {
      if (!alreadyBatching) {
        this._batching = false;
        this._flush();
      }
    }
  }
  /**
   * Subscribe to state changes.
   * @param {(state: object, changedKeys: string[]) => void} fn
   * @returns {() => void} unsubscribe
   */
  subscribe(fn) {
    this._subscribers.add(fn);
    return () => this._subscribers.delete(fn);
  }
  _scheduleNotify() {
    if (this._batching) return;
    if (this._scheduled) return;
    this._scheduled = true;
    Promise.resolve().then(() => this._flush());
  }
  _flush() {
    this._scheduled = false;
    if (this._dirtyKeys.size === 0) return;
    const changed = Array.from(this._dirtyKeys);
    this._dirtyKeys.clear();
    this._subscribers.forEach((fn) => {
      try {
        fn(this._raw, changed);
      } catch (err) {
        console.error("[StateStore] subscriber threw:", err);
      }
    });
  }
};

// client/core/Module.ts
var Module = class {
  constructor({ name, storageKey = null, initialState = {} } = {}) {
    this.name = name || this.constructor.name;
    this.storageKey = storageKey;
    this.store = new StateStore(initialState);
    this._domListeners = [];
    this._destroyed = false;
    this.log(`constructed`);
  }
  async init() {
    this.log("init");
    await this.load();
    this.render();
    this.bindEvents();
  }
  async load() {
  }
  render() {
  }
  bindEvents() {
  }
  destroy() {
    if (this._destroyed) return;
    this._domListeners.forEach(({ el, type, handler, options }) => {
      el.removeEventListener(type, handler, options);
    });
    this._domListeners = [];
    eventBus.unsubscribeAll(this);
    this._destroyed = true;
    this.log("destroyed");
  }
  /**
   * Load this module's records from storage, falling back to `seedFn()`
   * (typically a function returning a copy of seed/demo data) when nothing
   * is persisted yet.
   * @param {() => any} seedFn
   */
  async loadRecords(seedFn) {
    if (!this.storageKey) throw new Error(`${this.name}: loadRecords() requires storageKey`);
    const value = await storage.get(this.storageKey, null);
    if (value !== null) return value;
    return seedFn();
  }
  async saveRecords(data, { feedback = true } = {}) {
    if (!this.storageKey) throw new Error(`${this.name}: saveRecords() requires storageKey`);
    if (feedback) showStatusToast("Saving changes\u2026", "info", 12e4);
    try {
      await storage.set(this.storageKey, data);
      storage.invalidate("pa_recent_activities");
      storage.invalidate("pa_notifications");
    } catch (err) {
      this.logError("save failed", err);
      showStatusToast(err?.message || `Could not save ${this.name.toLowerCase()}. Please try again.`, "danger");
      throw err;
    }
  }
  $(selector, scope = document) {
    return $(selector, scope);
  }
  $all(selector, scope = document) {
    return $all(selector, scope);
  }
  /**
   * Add a DOM listener that is automatically removed in `destroy()`.
   * @param {EventTarget|null} el
   * @param {string} type
   * @param {Function} handler
   * @param {boolean|AddEventListenerOptions} [options]
   */
  on(el, type, handler, options) {
    if (!el) return;
    el.addEventListener(type, handler, options);
    this._domListeners.push({ el, type, handler, options });
  }
  onBus(event, handler) {
    eventBus.on(event, handler, { owner: this });
  }
  emit(event, payload) {
    eventBus.emit(event, payload);
  }
  toast(msg, type = "info", duration) {
    showToast(msg, type, duration);
  }
  statusToast(msg, type = "info", duration) {
    showStatusToast(msg, type, duration);
  }
  notify(text, icon, options) {
    void addNotification(text, icon, options);
  }
  log(...args) {
  }
  logError(...args) {
    console.error(`[${this.name}]`, ...args);
  }
};

export {
  MAX_CUSTOM_FONTS,
  buildCustomFontFromFile,
  eventBus,
  APPEARANCE_DEFAULTS,
  ICON_PREVIEW_SIZES,
  VALID_FONT_SIZES,
  VALID_FONT_WEIGHTS,
  VALID_SPACINGS,
  VALID_ICON_SIZES,
  getFontGroups,
  getFontById,
  normalizeAppearanceSettings,
  readAppearanceCache,
  writeAppearanceCache,
  applyAppearanceSettings,
  bootstrapAppearanceFromCache,
  storage,
  $,
  $all,
  $id,
  asFormField,
  asHtmlInput,
  asHtmlButton,
  $field,
  $input,
  $select,
  clearDomCache,
  escapeHtml,
  showToast,
  showStatusToast,
  renderNotifications,
  loadNotifications,
  addNotification,
  clearNotifications,
  markNotificationRead,
  requestBrowserNotificationPermission,
  Module
};
