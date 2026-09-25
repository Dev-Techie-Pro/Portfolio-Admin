/**
 * Custom uploaded font helpers — validation, @font-face registration, and metadata.
 */

export const MAX_CUSTOM_FONTS = 5;
export const MAX_FONT_BYTES = 2 * 1024 * 1024; // 2MB

const FONT_MIME_TYPES = new Set([
  'font/woff',
  'font/woff2',
  'font/ttf',
  'font/otf',
  'application/font-woff',
  'application/font-woff2',
  'application/x-font-woff',
  'application/x-font-ttf',
  'application/x-font-otf',
  'application/octet-stream',
]);

const FONT_EXTENSIONS = {
  woff: 'woff',
  woff2: 'woff2',
  ttf: 'truetype',
  otf: 'opentype',
};

const CUSTOM_FONT_STYLE_ID = 'pa-custom-fonts-style';

export function isCustomFontId(id) {
  return typeof id === 'string' && id.startsWith('custom-');
}

export function deriveFontFormat(file) {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  return FONT_EXTENSIONS[ext] || 'woff2';
}

export function deriveFontName(file) {
  const base = file.name.replace(/\.[^.]+$/, '');
  return base
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60) || 'Custom Font';
}

export function deriveFamilyName(displayName) {
  const safe = String(displayName || 'Custom Font')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .slice(0, 50) || 'Custom Font';
  return `PA Custom ${safe}`;
}

export function createCustomFontId() {
  const rand = Math.random().toString(36).slice(2, 8);
  return `custom-${Date.now().toString(36)}${rand}`;
}

export function validateFontFile(file) {
  if (!file) return 'No file selected.';
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (!FONT_EXTENSIONS[ext]) {
    return `"${file.name}" — only WOFF, WOFF2, TTF, or OTF files are supported.`;
  }
  if (!FONT_MIME_TYPES.has(file.type) && file.type !== '') {
    return `"${file.name}" — unsupported file type.`;
  }
  if (file.size > MAX_FONT_BYTES) {
    return `"${file.name}" — file exceeds the 2MB limit.`;
  }
  return null;
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read font file.'));
    reader.readAsDataURL(file);
  });
}

export function normalizeCustomFonts(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((f) => f && isCustomFontId(f.id) && f.url && f.familyName)
    .slice(0, MAX_CUSTOM_FONTS)
    .map((f) => ({
      id: f.id,
      name: String(f.name || f.familyName).slice(0, 60),
      familyName: String(f.familyName).slice(0, 80),
      url: f.url,
      format: f.format || 'woff2',
      fileName: typeof f.fileName === 'string' ? f.fileName.slice(0, 120) : '',
      uploadedAt: f.uploadedAt || null,
    }));
}

export function customFontToOption(font) {
  const stack = `'${font.familyName}', sans-serif`;
  return {
    id: font.id,
    name: font.name,
    stack,
    sample: 'Your custom typeface',
    isCustom: true,
  };
}

export function getCustomFontStack(font) {
  if (!font?.familyName) return null;
  return `'${font.familyName}', sans-serif`;
}

export function registerCustomFonts(customFonts = []) {
  if (typeof document === 'undefined') return;
  let style = document.getElementById(CUSTOM_FONT_STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = CUSTOM_FONT_STYLE_ID;
    document.head.appendChild(style);
  }

  const rules = normalizeCustomFonts(customFonts).map((font) => {
    const format = font.format || 'woff2';
    const escapedFamily = font.familyName.replace(/'/g, "\\'");
    const escapedUrl = font.url.replace(/"/g, '\\"');
    return `@font-face{font-family:'${escapedFamily}';src:url("${escapedUrl}") format('${format}');font-display:swap;}`;
  });

  style.textContent = rules.join('\n');
}

export async function buildCustomFontFromFile(file) {
  const error = validateFontFile(file);
  if (error) throw new Error(error);

  const { uploadCustomFontFile } = await import('./media-upload.js');
  const uploaded = await uploadCustomFontFile(file);
  const url = uploaded.url;
  const name = deriveFontName(file);
  const familyName = deriveFamilyName(name);

  return {
    id: createCustomFontId(),
    name,
    familyName,
    url,
    format: deriveFontFormat(file),
    fileName: file.name,
    uploadedAt: new Date().toISOString(),
  };
}
