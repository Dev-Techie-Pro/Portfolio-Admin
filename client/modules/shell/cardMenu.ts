const MENU_MARGIN = 8;
const MENU_MIN_WIDTH = 160;

function resetCardMenuPosition(menu) {
  if (!menu) return;
  menu.classList.remove('is-fixed', 'flip-up');
  menu.style.cssText = '';
}

export function closeAllCardMenus() {
  document.querySelectorAll('.pa-card-menu.open').forEach((menu) => {
    menu.classList.remove('open');
    resetCardMenuPosition(menu);
  });
}

/**
 * Toggle one card's menu open, closing any other open menu first.
 * @param {HTMLElement} menu
 * @param {HTMLElement} [trigger] Button that opened the menu (enables smart positioning).
 */
export function toggleCardMenu(menu, trigger) {
  const isOpen = menu.classList.contains('open');
  closeAllCardMenus();
  if (!isOpen) openCardMenu(menu, trigger);
}

/**
 * Open a card menu with viewport-aware positioning for scrollable table rows.
 * @param {HTMLElement} menu
 * @param {HTMLElement} [trigger]
 */
export function openCardMenu(menu, trigger) {
  if (!menu) return;
  closeAllCardMenus();
  menu.classList.add('open');
  if (trigger && menu.closest('.pa-msg-actions')) {
    requestAnimationFrame(() => positionCardMenu(menu, trigger));
  }
}

function getScrollParents(el) {
  const parents = [];
  let node = el?.parentElement;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    const { overflow, overflowX, overflowY } = style;
    if (['auto', 'scroll', 'overlay'].some((v) => overflow === v || overflowX === v || overflowY === v)) {
      parents.push(node);
    }
    node = node.parentElement;
  }
  return parents;
}

function getClipBounds(trigger) {
  const scrollParent = getScrollParents(trigger)[0];
  if (scrollParent) return scrollParent.getBoundingClientRect();
  return {
    top: MENU_MARGIN,
    left: MENU_MARGIN,
    right: window.innerWidth - MENU_MARGIN,
    bottom: window.innerHeight - MENU_MARGIN,
  };
}

function positionCardMenu(menu, trigger) {
  if (!menu.closest('.pa-msg-actions')) return;

  const triggerRect = trigger.getBoundingClientRect();
  const menuWidth = Math.max(menu.offsetWidth || MENU_MIN_WIDTH, MENU_MIN_WIDTH);
  const menuHeight = menu.offsetHeight || 0;
  const clip = getClipBounds(trigger);

  const spaceBelow = clip.bottom - triggerRect.bottom;
  const spaceAbove = triggerRect.top - clip.top;
  const openBelow = spaceBelow >= menuHeight + MENU_MARGIN || spaceBelow >= spaceAbove;

  menu.classList.add('is-fixed');
  menu.classList.toggle('flip-up', !openBelow);

  let left = triggerRect.right - menuWidth;
  left = Math.max(clip.left + MENU_MARGIN, Math.min(left, clip.right - menuWidth - MENU_MARGIN));

  let top;
  if (openBelow) {
    top = triggerRect.bottom - 7;
    top = Math.min(top, clip.bottom - menuHeight - MENU_MARGIN);
  } else {
    top = triggerRect.top - menuHeight - 7;
    top = Math.max(top, clip.top + MENU_MARGIN);
  }

  menu.style.position = 'fixed';
  menu.style.top = `${top}px`;
  menu.style.left = `${left}px`;
  menu.style.right = 'auto';
  menu.style.bottom = 'auto';
  menu.style.minWidth = `${MENU_MIN_WIDTH}px`;
  menu.style.zIndex = '200';
}
