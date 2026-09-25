const _queryCache = new Map();

export function $(selector, scope = document) {
  if (scope === document && selector.startsWith('#') && !selector.includes(' ')) {
    return document.getElementById(selector.slice(1));
  }
  return scope.querySelector(selector);
}

export function $all(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

export function $id(id: string): HTMLElement | null {
  if (_queryCache.has(id)) {
    const cached = _queryCache.get(id);
    if (cached && cached.isConnected) return cached;
    _queryCache.delete(id);
  }
  const el = document.getElementById(id);
  if (el) _queryCache.set(id, el);
  return el;
}

export type FormFieldElement = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export function asFormField(el: Element | HTMLElement | null | undefined): FormFieldElement | null {
  if (el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement) {
    return el;
  }
  return null;
}

export function asHtmlInput(el: Element | null | undefined): HTMLInputElement | null {
  return el instanceof HTMLInputElement ? el : null;
}

export function asHtmlButton(el: Element | HTMLElement | null | undefined): HTMLButtonElement | null {
  return el instanceof HTMLButtonElement ? el : null;
}

export function $field(id: string): FormFieldElement | null {
  return asFormField($id(id));
}

export function $input(id: string): HTMLInputElement | null {
  const el = $id(id);
  return el instanceof HTMLInputElement ? el : null;
}

export function $select(id: string): HTMLSelectElement | null {
  const el = $id(id);
  return el instanceof HTMLSelectElement ? el : null;
}

export function clearDomCache() {
  _queryCache.clear();
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

export function toggleClass(el, className, force) {
  el?.classList.toggle(className, force);
}

export function setVisible(el, visible) {
  el?.classList.toggle('visible', visible);
}
