import { escapeHtml } from "./dom.js";
function slugify(text) {
  return String(text || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function isValidSlug(s) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s);
}
function isValidCategoryKey(k) {
  return /^[a-z0-9][a-z0-9-]*$/.test(k);
}
function isValidUrl(str) {
  if (!str) return true;
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
function appendCopySuffix(filename) {
  const dot = filename.lastIndexOf(".");
  if (dot <= 0) return `${filename} (copy)`;
  return `${filename.slice(0, dot)} (copy)${filename.slice(dot)}`;
}
function uniqueCopyName(baseName, existingNames) {
  const taken = new Set((existingNames || []).map((n2) => String(n2 || "").toLowerCase()));
  let candidate = `${baseName} (Copy)`;
  let n = 2;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${baseName} (Copy ${n})`;
    n += 1;
  }
  return candidate;
}
export {
  appendCopySuffix,
  escapeHtml,
  isValidCategoryKey,
  isValidSlug,
  isValidUrl,
  slugify,
  uniqueCopyName
};
