const _queryCache = /* @__PURE__ */ new Map();
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
function toggleClass(el, className, force) {
  el?.classList.toggle(className, force);
}
function setVisible(el, visible) {
  el?.classList.toggle("visible", visible);
}
export {
  $,
  $all,
  $field,
  $id,
  $input,
  $select,
  asFormField,
  asHtmlButton,
  asHtmlInput,
  clearDomCache,
  escapeHtml,
  setVisible,
  toggleClass
};
