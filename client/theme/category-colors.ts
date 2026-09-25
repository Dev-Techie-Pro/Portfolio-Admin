/**
 * Single source of truth for built-in category accent colors.
 * Hex values align with :root tokens in app/styles/tokens.css.
 */
export const CATEGORY_THEME = {
  enterprise: { hex: '#22c55e', colorVar: '--pa-green' },
  educational: { hex: '#dc12f7', colorVar: '--pa-purple' },
  desktop: { hex: '#31f1d8', colorVar: '--pa-teal' },
  medical: { hex: '#ff6600', colorVar: '--pa-orange' },
  ecommerce: { hex: '#a78bfa', colorVar: '--pa-edu' },
  travel: { hex: '#ced11b', colorVar: '--pa-yellow' },
  web: { hex: '#445deb', colorVar: '--pa-web' },
  nonprofit: { hex: '#f0437e', colorVar: '--pa-pink' },
};

/** Built-in category keys that map to accent tokens in CSS via data-cat-key. */
export const BUILTIN_CATEGORY_KEYS = new Set(Object.keys(CATEGORY_THEME));

/** Accent hex colours for pickers and stored category records. */
export const CATEGORY_KEY_ACCENT_HEX = Object.fromEntries(
  Object.entries(CATEGORY_THEME).map(([key, theme]) => [key, theme.hex])
);

export function normalizeCategoryKey(key) {
  return String(key || '').trim().toLowerCase();
}

/** Map a stored hex accent to the nearest built-in category key for card styling. */
export function categoryKeyFromAccentHex(hex) {
  const normalized = String(hex || '').trim().toLowerCase().replace(/^#/, '');
  if (!normalized) return '';
  const withHash = `#${normalized}`;
  const entry = Object.entries(CATEGORY_KEY_ACCENT_HEX).find(
    ([, value]) => value.toLowerCase() === withHash
  );
  return entry ? entry[0] : '';
}
