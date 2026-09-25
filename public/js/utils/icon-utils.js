import { ICONS } from "./icon-registry.js";
import { getSvgUrl } from "./icon-registry-api.js";
const DEFAULT_TOOL_ICON = "ri-tools-line";
const DEFAULT_CATEGORY_ICON = "ri-tools-line";
const LEGACY_ICON_KEYS = Object.keys(ICONS).sort((a, b) => a.localeCompare(b));
const REMIX_ICON_RE = /^ri-[a-z0-9][a-z0-9-]*$/;
const LEGACY_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function isRemixIconKey(key) {
  return !!(key && REMIX_ICON_RE.test(key));
}
function isLegacyIconKey(key) {
  return !!(key && ICONS[key]);
}
function isRegistryIconKey(key) {
  return !!(key && LEGACY_SLUG_RE.test(key) && !isLegacyIconKey(key) && !isRemixIconKey(key));
}
function listLegacyIconKeys() {
  return LEGACY_ICON_KEYS;
}
function resolveIconKey(value, fallback = DEFAULT_TOOL_ICON) {
  if (value && (isRemixIconKey(value) || isLegacyIconKey(value) || isRegistryIconKey(value))) {
    return value;
  }
  if (fallback && (isRemixIconKey(fallback) || isLegacyIconKey(fallback) || isRegistryIconKey(fallback))) {
    return fallback;
  }
  return DEFAULT_TOOL_ICON;
}
function getIconSvg(key, fallback = DEFAULT_TOOL_ICON) {
  const resolved = resolveIconKey(key, fallback);
  return ICONS[resolved] || "";
}
function getIconLabel(key, fallback = DEFAULT_TOOL_ICON) {
  const resolved = resolveIconKey(key, fallback);
  return resolved;
}
function renderIconHtml(key, { color, className = "pa-svg-icon" } = {}) {
  const resolved = resolveIconKey(key);
  const style = color ? ` style="color:${color}"` : "";
  const cls = className ? ` class="${className}"` : "";
  if (isRemixIconKey(resolved)) {
    return `<span${cls}${style} aria-hidden="true"><i class="${resolved}"></i></span>`;
  }
  if (isLegacyIconKey(resolved)) {
    const svg = ICONS[resolved] || "";
    if (!svg) return "";
    return `<span${cls}${style} aria-hidden="true">${svg}</span>`;
  }
  const src = getSvgUrl(resolved);
  if (!src) return "";
  const imgStyle = color ? ` style="color:${color}"` : "";
  return `<span${cls}${style} aria-hidden="true"><img class="pa-svg-icon-img" src="${src}" alt="" loading="lazy" decoding="async"${imgStyle} /></span>`;
}
function renderIconPreviewHtml(key, fallback = DEFAULT_TOOL_ICON) {
  return renderIconHtml(resolveIconKey(key, fallback), { className: "pa-svg-icon pa-svg-icon--preview" });
}
export {
  DEFAULT_CATEGORY_ICON,
  DEFAULT_TOOL_ICON,
  getIconLabel,
  getIconSvg,
  isLegacyIconKey,
  isRegistryIconKey,
  isRemixIconKey,
  listLegacyIconKeys,
  renderIconHtml,
  renderIconPreviewHtml,
  resolveIconKey
};
