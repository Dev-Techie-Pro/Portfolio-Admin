// client/theme/category-colors.ts
var CATEGORY_THEME = {
  enterprise: { hex: "#22c55e", colorVar: "--pa-green" },
  educational: { hex: "#dc12f7", colorVar: "--pa-purple" },
  desktop: { hex: "#31f1d8", colorVar: "--pa-teal" },
  medical: { hex: "#ff6600", colorVar: "--pa-orange" },
  ecommerce: { hex: "#a78bfa", colorVar: "--pa-edu" },
  travel: { hex: "#ced11b", colorVar: "--pa-yellow" },
  web: { hex: "#445deb", colorVar: "--pa-web" },
  nonprofit: { hex: "#f0437e", colorVar: "--pa-pink" }
};
var BUILTIN_CATEGORY_KEYS = new Set(Object.keys(CATEGORY_THEME));
var CATEGORY_KEY_ACCENT_HEX = Object.fromEntries(
  Object.entries(CATEGORY_THEME).map(([key, theme]) => [key, theme.hex])
);
function normalizeCategoryKey(key) {
  return String(key || "").trim().toLowerCase();
}
function categoryKeyFromAccentHex(hex) {
  const normalized = String(hex || "").trim().toLowerCase().replace(/^#/, "");
  if (!normalized) return "";
  const withHash = `#${normalized}`;
  const entry = Object.entries(CATEGORY_KEY_ACCENT_HEX).find(
    ([, value]) => value.toLowerCase() === withHash
  );
  return entry ? entry[0] : "";
}

export {
  normalizeCategoryKey,
  categoryKeyFromAccentHex
};
