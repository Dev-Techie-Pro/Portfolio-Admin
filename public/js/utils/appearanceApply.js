import {
  applyAppearanceSettings,
  readAppearanceCache,
  writeAppearanceCache
} from "./appearanceCache.js";
const DEFAULT_ACCENT = "#ff6600";
function hexToRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)].join(",");
}
function normalizeHex(hex) {
  return typeof hex === "string" && /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : DEFAULT_ACCENT;
}
function applyAppearanceTheme(theme, systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches) {
  const dark = theme === "system" ? systemDark : theme === "dark";
  document.body.classList.toggle("light", !dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}
function applyAppearanceAccent(hex) {
  const color = normalizeHex(hex);
  const root = document.documentElement;
  root.style.setProperty("--pa-orange", color);
  root.style.setProperty("--pa-orange-rgb", hexToRgb(color));
  root.style.setProperty("--pa-orange-dim", `rgba(${hexToRgb(color)}, 0.12)`);
  root.style.setProperty("--pa-orange-hover", color);
}
function applyAppearanceBranding(settings = {}) {
  applyAppearanceSettings(settings);
}
async function loadPublicAppearance() {
  const cached = readAppearanceCache();
  if (cached) return cached;
  const bag = typeof window !== "undefined" ? window.__paPrefetch : null;
  const pending = bag?.appearance_settings_v2;
  if (pending && typeof pending.then === "function") {
    try {
      const value = await pending;
      if (value) {
        writeAppearanceCache(value);
        return value;
      }
    } catch {
    }
  }
  const res = await fetch("/api/appearance/public", {
    method: "GET",
    credentials: "same-origin",
    headers: { Accept: "application/json" }
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data) writeAppearanceCache(data);
  return data;
}
async function initAuthAppearance() {
  try {
    const cached = readAppearanceCache();
    if (cached) applyAppearanceSettings(cached);
    const settings = await loadPublicAppearance();
    if (settings) applyAppearanceSettings(settings);
    const { updateFaviconFromAppearance } = await import("./favicon.js");
    updateFaviconFromAppearance(settings || cached || {});
  } catch {
  }
}
export {
  applyAppearanceAccent,
  applyAppearanceBranding,
  applyAppearanceTheme,
  initAuthAppearance,
  loadPublicAppearance
};
