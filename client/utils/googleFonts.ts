/**
 * Load Google Font families on demand (layout preloads Inter + Outfit only).
 */

const LAYOUT_PRELOADED = new Set(['inter', 'outfit']);

/** Google Fonts CSS2 family param + weight list per appearance preset id. */
const GOOGLE_FONT_SPECS: Record<string, { family: string; weights: string }> = {
  'plus-jakarta-sans': { family: 'Plus+Jakarta+Sans', weights: '300;400;600;700' },
  manrope: { family: 'Manrope', weights: '300;400;600;700' },
  figtree: { family: 'Figtree', weights: '300;400;600;700' },
  'dm-sans': { family: 'DM+Sans', weights: '400;500;600;700' },
  sora: { family: 'Sora', weights: '300;400;600;700' },
  'instrument-sans': { family: 'Instrument+Sans', weights: '400;500;600;700' },
  'space-grotesk': { family: 'Space+Grotesk', weights: '400;500;600;700' },
  onest: { family: 'Onest', weights: '300;400;600;700' },
  fraunces: { family: 'Fraunces', weights: '400;600;700' },
  'source-serif-4': { family: 'Source+Serif+4', weights: '400;600;700' },
  literata: { family: 'Literata', weights: '400;600;700' },
  'jetbrains-mono': { family: 'JetBrains+Mono', weights: '400;500;700' },
  'ibm-plex-mono': { family: 'IBM+Plex+Mono', weights: '400;500;700' },
  'fira-code': { family: 'Fira+Code', weights: '400;500;700' },
  'source-code-pro': { family: 'Source+Code+Pro', weights: '400;500;700' },
  'dm-mono': { family: 'DM+Mono', weights: '400;500' },
};

export function ensureGoogleFontLoaded(fontId: string | null | undefined) {
  if (!fontId || typeof document === 'undefined') return;
  if (LAYOUT_PRELOADED.has(fontId) || fontId.startsWith('custom-')) return;

  const spec = GOOGLE_FONT_SPECS[fontId];
  if (!spec) return;

  const linkId = `pa-gf-${fontId}`;
  if (document.getElementById(linkId)) return;

  const link = document.createElement('link');
  link.id = linkId;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${spec.family}:wght@${spec.weights}&display=swap`;
  document.head.appendChild(link);
}

/** Minimal map for boot-prefetch IIFE (keep in sync with GOOGLE_FONT_SPECS). */
export const GOOGLE_FONT_SPECS_FOR_BOOT = GOOGLE_FONT_SPECS;
