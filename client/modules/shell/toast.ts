import { $id, escapeHtml } from '../../utils/dom.js';

const TOAST_ICONS = {
  success: 'ri-checkbox-circle-line',
  info: 'ri-information-line',
  danger: 'ri-error-warning-line',
};

/** Keep toasts on document.body so legacy page HTML swaps cannot hide them. */
function ensureToastWrap() {
  let wrap = document.getElementById('paToastWrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'paToastWrap';
    wrap.className = 'pa-toast-wrap';
    wrap.setAttribute('role', 'status');
    wrap.setAttribute('aria-live', 'polite');
    document.body.appendChild(wrap);
    return wrap;
  }
  if (wrap.parentElement !== document.body) {
    document.body.appendChild(wrap);
  }
  return wrap;
}

/**
 * Show a toast message.
 * @param {string} msg
 * @param {'success'|'info'|'danger'} [type]
 * @param {number} [duration] ms before auto-dismiss
 */
export function showToast(msg, type = 'info', duration = 3500) {
  const wrap = ensureToastWrap();
  if (!wrap) {
    console.warn('[toast]', type, msg);
    return;
  }
  const el = document.createElement('div');
  el.className = `pa-toast ${type}`;
  el.innerHTML = `<i class="pa-toast-icon ${TOAST_ICONS[type] || TOAST_ICONS.info}"></i><span>${escapeHtml(msg)}</span><button class="pa-toast-close" aria-label="Dismiss"><i class="ri-close-line"></i></button>`;
  el.querySelector('.pa-toast-close').addEventListener('click', () => removeToast(el));
  wrap.appendChild(el);
  el._timer = setTimeout(() => removeToast(el), duration);
}

export function removeToast(el) {
  if (!el || !el.parentElement) return;
  clearTimeout(el._timer);
  el.classList.add('removing');
  setTimeout(() => el.remove(), 200);
}

export function clearToasts() {
  const wrap = ensureToastWrap();
  if (!wrap) return;
  wrap.querySelectorAll('.pa-toast').forEach((el) => removeToast(el));
}

/**
 * @param {string} msg
 * @param {'success'|'info'|'danger'} [type]
 * @param {number} [duration]
 */
export function showStatusToast(msg, type = 'info', duration = 4500) {
  clearToasts();
  showToast(msg, type, duration);
}
