import {
  customFontToOption,
  isCustomFontId,
  normalizeCustomFonts,
  registerCustomFonts
} from "./customFonts.js";
import { ensureGoogleFontLoaded } from "./googleFonts.js";
import { eventBus } from "../core/EventBus.js";
const APPEARANCE_CACHE_KEY = "pa_appearance_settings_v2";
const APPEARANCE_DEFAULTS = {
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
const ICON_SIZE_PRESETS = {
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
const ICON_PREVIEW_SIZES = { small: "12px", medium: "16px", large: "20px" };
const CUSTOM_FONTS = [
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
const FONT_SIZE_MAP = {
  "10px": "10px",
  "14px": "14px",
  "16px": "16px"
};
const FONT_SIZE_TOKEN_BASE = {
  xm: 8,
  sm: 10,
  xmd: 12,
  md: 14,
  lg: 16,
  xl: 22,
  xxl: 42
};
const FONT_WEIGHT_MAP = {
  300: "300",
  400: "400",
  600: "600",
  700: "700"
};
const FONT_WEIGHT_OFFSETS = {
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
const SPACING_MAP = {
  "5px": "5px",
  "10px": "10px",
  "15px": "15px"
};
const RADIUS_MAP = {
  "0px": { sm: "0px", md: "0px", lg: "0px", xl: "0px" },
  "5px": { sm: "5px", md: "10px", lg: "15px", xl: "20px" },
  "14px": { sm: "8px", md: "15px", lg: "18px", xl: "24px" },
  "25px": { sm: "14px", md: "18px", lg: "20px", xl: "30px" }
};
const ALL_FONT_IDS = CUSTOM_FONTS.flatMap((g) => g.fonts.map((f) => f.id));
const VALID_RADII = Object.keys(RADIUS_MAP);
const VALID_FONT_SIZES = Object.keys(FONT_SIZE_MAP);
function migrateFontSize(size) {
  if (typeof size === "string" && VALID_FONT_SIZES.includes(size)) return size;
  const px = parseFloat(String(size)) || 14;
  if (px <= 11) return "10px";
  if (px <= 15) return "14px";
  return "16px";
}
const VALID_FONT_WEIGHTS = Object.keys(FONT_WEIGHT_MAP);
const VALID_SPACINGS = Object.keys(SPACING_MAP);
const VALID_ICON_SIZES = Object.keys(ICON_SIZE_PRESETS);
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
export {
  APPEARANCE_CACHE_KEY,
  APPEARANCE_DEFAULTS,
  CUSTOM_FONTS,
  ICON_PREVIEW_SIZES,
  ICON_SIZE_PRESETS,
  VALID_FONT_SIZES,
  VALID_FONT_WEIGHTS,
  VALID_ICON_SIZES,
  VALID_RADII,
  VALID_SPACINGS,
  applyAccentCssVariables,
  applyAppearanceSettings,
  applyFontSizeTokens,
  applyFontWeightTokens,
  applyIconSizeVariables,
  bootstrapAppearanceFromCache,
  getFontById,
  getFontGroups,
  isValidFontFamilyId,
  migrateFontSize,
  normalizeAppearanceSettings,
  readAppearanceCache,
  writeAppearanceCache
};
