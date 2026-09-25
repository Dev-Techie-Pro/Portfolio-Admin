const TOGGLE_SELECTOR = '.pa-password-toggle, .pa-auth-pass-toggle';
const WRAP_SELECTOR = '.pa-password-wrap, .pa-auth-input-wrap';
const BOUND_ATTR = 'data-pa-pw-toggle-bound';

let delegationBound = false;

function resolvePasswordInput(ref) {
  if (!ref) return null;

  if (typeof ref === 'string') {
    return resolvePasswordInput(document.getElementById(ref));
  }

  if (ref.tagName === 'INPUT') {
    if (ref.type === 'password') return ref;
    if (ref.type === 'text' && ref.closest(WRAP_SELECTOR)) return ref;
    return null;
  }

  if (ref.matches?.(WRAP_SELECTOR)) {
    return ref.querySelector('input[type="password"], input[type="text"].pa-form-input');
  }

  if (typeof ref.querySelector === 'function') {
    return ref.querySelector('input[type="password"]')
      || ref.querySelector(`${WRAP_SELECTOR} input[type="password"]`);
  }

  return null;
}

function findToggleForInput(input) {
  const wrap = input.closest(WRAP_SELECTOR);
  if (wrap) {
    const toggle = wrap.querySelector(TOGGLE_SELECTOR);
    if (toggle) return toggle;
  }

  let sibling = input.nextElementSibling;
  while (sibling) {
    if (sibling.matches?.(TOGGLE_SELECTOR)) return sibling;
    sibling = sibling.nextElementSibling;
  }

  return null;
}

function ensurePasswordWrap(input) {
  if (input.closest(WRAP_SELECTOR)) return input.closest(WRAP_SELECTOR);

  const wrap = document.createElement('div');
  wrap.className = 'pa-password-wrap';
  input.parentNode?.insertBefore(wrap, input);
  wrap.appendChild(input);
  return wrap;
}

function createToggleButton(input) {
  const wrap = ensurePasswordWrap(input);
  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'pa-password-toggle';
  toggleBtn.setAttribute('aria-label', 'Show password');
  toggleBtn.innerHTML = '<i class="ri-eye-line"></i>';
  wrap.appendChild(toggleBtn);
  return toggleBtn;
}

function usesValueLabel(toggleBtn) {
  const label = toggleBtn.getAttribute('aria-label') || '';
  return /value/i.test(label) && !/password/i.test(label);
}

export function updatePasswordToggleUi(input, toggleBtn) {
  if (!input || !toggleBtn) return;
  const isHidden = input.type === 'password';
  const icon = toggleBtn.querySelector('i');
  if (icon) {
    icon.className = isHidden ? 'ri-eye-line' : 'ri-eye-off-line';
  }
  const valueLabel = usesValueLabel(toggleBtn);
  toggleBtn.setAttribute(
    'aria-label',
    isHidden
      ? (valueLabel ? 'Show value' : 'Show password')
      : (valueLabel ? 'Hide value' : 'Hide password'),
  );
  toggleBtn.setAttribute('aria-pressed', String(!isHidden));
}

export function togglePasswordVisibility(input, toggleBtn) {
  if (!input || !toggleBtn) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  updatePasswordToggleUi(input, toggleBtn);
  input.focus({ preventScroll: true });
}

/**
 * Ensure a password field has a toggle button and synced UI.
 * Click handling is delegated globally via initPasswordToggles().
 */
export function setupPasswordToggle(inputRef, toggleBtnId) {
  const input = resolvePasswordInput(inputRef);
  if (!input) {
    console.warn('[password-toggle] No password input found for:', inputRef);
    return null;
  }

  let toggleBtn = toggleBtnId ? document.getElementById(toggleBtnId) : findToggleForInput(input);
  if (!toggleBtn) {
    toggleBtn = createToggleButton(input);
  }

  const wrap = input.closest('.pa-auth-input-wrap');
  if (wrap) wrap.classList.add('has-toggle');

  updatePasswordToggleUi(input, toggleBtn);
  toggleBtn.setAttribute(BOUND_ATTR, 'true');
  return toggleBtn;
}

/**
 * Ensure all password inputs inside a container have toggle buttons.
 */
export function setupAllPasswordToggles(
  container: Document | Element | string = document,
  selector = 'input[type="password"]',
) {
  const containerEl = typeof container === 'string' ? document.getElementById(container) : container;
  if (!containerEl) {
    console.warn('[password-toggle] Container not found:', container);
    return [];
  }

  const toggles = [];
  containerEl.querySelectorAll(selector).forEach((input) => {
    const toggle = setupPasswordToggle(input);
    if (toggle) toggles.push(toggle);
  });
  return toggles;
}

/**
 * Bind one delegated click handler for every password toggle in the app.
 */
export function initPasswordToggles(root = document) {
  if (delegationBound) return;
  delegationBound = true;

  root.addEventListener('click', (event) => {
    const toggleBtn = event.target.closest(TOGGLE_SELECTOR);
    if (!toggleBtn) return;

    event.preventDefault();

    const wrap = toggleBtn.closest(WRAP_SELECTOR);
    let input = wrap?.querySelector('input');

    if (!input) {
      let sibling = toggleBtn.previousElementSibling;
      while (sibling) {
        if (sibling.tagName === 'INPUT') {
          input = sibling;
          break;
        }
        sibling = sibling.previousElementSibling;
      }
    }

    if (!input || (input.type !== 'password' && input.type !== 'text')) return;

    toggleBtn.setAttribute(BOUND_ATTR, 'true');
    togglePasswordVisibility(input, toggleBtn);
  });
}

/** Styles live in app/styles/components.css; kept for backwards compatibility. */
export function injectPasswordToggleStyles() {}
