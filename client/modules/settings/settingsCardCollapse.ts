const STORAGE_KEY = 'pa_settings_card_collapse';
const SCOPE = '.pa-tab-panel[data-panel="settings"]';

const CARD_SELECTORS = [
  '.pa-card-settings',
  '.pa-profile-card',
  '.pa-security-card',
  '.pa-notification-card',
].join(', ');

let delegationBound = false;

function loadCollapsedState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function saveCollapsedState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* ignore quota errors */
  }
}

function getCardKey(card, title) {
  if (card.id) return card.id;
  const tab = card.closest('.pa-tab-panel')?.dataset.content || 'settings';
  const label = title.textContent.replace(/\s+/g, ' ').trim().toLowerCase();
  return `${tab}-${label}`;
}

function setCardCollapsed(card, title, collapsed) {
  card.classList.toggle('is-collapsed', collapsed);
  title.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
}

function wrapCardBody(card, title) {
  if (title.nextElementSibling?.classList.contains('pa-card-collapse-body')) return;

  const body = document.createElement('div');
  body.className = 'pa-card-collapse-body';

  let sibling = title.nextElementSibling;
  while (sibling) {
    const next = sibling.nextElementSibling;
    body.appendChild(sibling);
    sibling = next;
  }

  title.insertAdjacentElement('afterend', body);
}

function enhanceCard(card) {
  if (card.dataset.collapseReady) return;

  const title = card.querySelector('.pa-card-title');
  if (!title) return;

  card.dataset.collapseReady = '1';
  card.classList.add('pa-settings-card');

  title.classList.add('pa-card-collapse-trigger');
  title.setAttribute('role', 'button');
  title.setAttribute('tabindex', '0');

  if (!title.querySelector('.pa-card-collapse-icon')) {
    const icon = document.createElement('i');
    icon.className = 'ri-arrow-down-s-line pa-card-collapse-icon';
    icon.setAttribute('aria-hidden', 'true');
    title.appendChild(icon);
  }

  wrapCardBody(card, title);

  const key = getCardKey(card, title);
  card.dataset.collapseKey = key;

  const state = loadCollapsedState();
  setCardCollapsed(card, title, Boolean(state[key]));
}

function toggleCard(card) {
  const title = card.querySelector('.pa-card-collapse-trigger');
  if (!title) return;

  const collapsed = !card.classList.contains('is-collapsed');
  setCardCollapsed(card, title, collapsed);

  const state = loadCollapsedState();
  const key = card.dataset.collapseKey;
  if (key) {
    if (collapsed) state[key] = true;
    else delete state[key];
    saveCollapsedState(state);
  }
}

function bindDelegation() {
  if (delegationBound) return;
  delegationBound = true;

  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('.pa-card-collapse-trigger');
    if (!trigger) return;

    const card = trigger.closest('.pa-settings-card');
    if (!card?.closest(SCOPE)) return;

    e.preventDefault();
    toggleCard(card);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;

    const trigger = e.target.closest('.pa-card-collapse-trigger');
    if (!trigger) return;

    const card = trigger.closest('.pa-settings-card');
    if (!card?.closest(SCOPE)) return;

    e.preventDefault();
    toggleCard(card);
  });
}

export function initSettingsCardCollapse() {
  document.querySelectorAll(`${SCOPE} ${CARD_SELECTORS}`).forEach(enhanceCard);
  bindDelegation();
}
