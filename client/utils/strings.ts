export { escapeHtml } from './dom.js';

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function isValidSlug(s) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);
}

export function isValidCategoryKey(k) {
  return /^[a-z0-9][a-z0-9-]*$/.test(k);
}

export function isValidUrl(str) {
  if (!str) return true;
  try {
    const u = new URL(str);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function appendCopySuffix(filename) {
  const dot = filename.lastIndexOf('.');
  if (dot <= 0) return `${filename} (copy)`;
  return `${filename.slice(0, dot)} (copy)${filename.slice(dot)}`;
}

/** Pick a duplicate label that does not collide with existing names (case-insensitive). */
export function uniqueCopyName(baseName, existingNames) {
  const taken = new Set((existingNames || []).map((n) => String(n || '').toLowerCase()));
  let candidate = `${baseName} (Copy)`;
  let n = 2;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${baseName} (Copy ${n})`;
    n += 1;
  }
  return candidate;
}
