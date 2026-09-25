// client/utils/dom.ts
var _queryCache = /* @__PURE__ */ new Map();
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

// client/modules/shell/toast.ts
var TOAST_ICONS = {
  success: "ri-checkbox-circle-line",
  info: "ri-information-line",
  danger: "ri-error-warning-line"
};
function ensureToastWrap() {
  let wrap = document.getElementById("paToastWrap");
  if (!wrap) {
    wrap = document.createElement("div");
    wrap.id = "paToastWrap";
    wrap.className = "pa-toast-wrap";
    wrap.setAttribute("role", "status");
    wrap.setAttribute("aria-live", "polite");
    document.body.appendChild(wrap);
    return wrap;
  }
  if (wrap.parentElement !== document.body) {
    document.body.appendChild(wrap);
  }
  return wrap;
}
function showToast(msg, type = "info", duration = 3500) {
  const wrap = ensureToastWrap();
  if (!wrap) {
    console.warn("[toast]", type, msg);
    return;
  }
  const el = document.createElement("div");
  el.className = `pa-toast ${type}`;
  el.innerHTML = `<i class="pa-toast-icon ${TOAST_ICONS[type] || TOAST_ICONS.info}"></i><span>${escapeHtml(msg)}</span><button class="pa-toast-close" aria-label="Dismiss"><i class="ri-close-line"></i></button>`;
  el.querySelector(".pa-toast-close").addEventListener("click", () => removeToast(el));
  wrap.appendChild(el);
  el._timer = setTimeout(() => removeToast(el), duration);
}
function removeToast(el) {
  if (!el || !el.parentElement) return;
  clearTimeout(el._timer);
  el.classList.add("removing");
  setTimeout(() => el.remove(), 200);
}
function clearToasts() {
  const wrap = ensureToastWrap();
  if (!wrap) return;
  wrap.querySelectorAll(".pa-toast").forEach((el) => removeToast(el));
}
function showStatusToast(msg, type = "info", duration = 4500) {
  clearToasts();
  showToast(msg, type, duration);
}

export {
  $,
  $all,
  $id,
  asFormField,
  asHtmlInput,
  asHtmlButton,
  $field,
  $input,
  $select,
  clearDomCache,
  escapeHtml,
  showToast,
  showStatusToast
};
