import { hideNavFlyout, isSidebarCollapsedDesktop, showNavFlyout } from './sidebarCollapse.js';

const ROUTE_RAIL: [string, string][] = [
  ['/settings', 'settings'],
  ['/tool-categories', 'tools'],
  ['/technologies', 'tools'],
  ['/tools', 'tools'],
  ['/blog-categories', 'content'],
  ['/blog-post', 'content'],
  ['/testimonials', 'content'],
  ['/experience', 'content'],
  ['/media-library', 'content'],
  ['/projects', 'projects'],
  ['/categories', 'projects'],
  ['/tags', 'projects'],
  ['/recent-activities', 'home'],
  ['/contact-messages', 'home'],
  ['/users', 'home'],
];

function resolveRailSection(path = window.location.pathname) {
  if (path === '/' || path === '') return 'home';
  for (const [needle, section] of ROUTE_RAIL) {
    if (path.includes(needle)) return section;
  }
  return 'home';
}

function getRailButton(section: string) {
  return document.querySelector(`.pa-rail-btn[data-rail-target="${section}"]`);
}

function getNavGroup(section: string) {
  return document.querySelector(`.pa-nav-group[data-nav-group="${section}"]`);
}

export function syncSidebarRailActive() {
  const section = resolveRailSection();
  document.querySelectorAll('.pa-rail-btn[data-rail-target]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.railTarget === section);
  });
}

function focusNavGroup(section: string) {
  const group = getNavGroup(section);
  if (!group) return;

  if (isSidebarCollapsedDesktop()) {
    showNavFlyout(group);
    return;
  }

  hideNavFlyout();
  group.classList.add('pa-nav-anim-ready', 'open');
  group.querySelector(':scope > .pa-nav-parent-row .pa-nav-toggle')
    ?.setAttribute('aria-expanded', 'true');
  group.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

let railBound = false;

export function initSidebarRailNav() {
  syncSidebarRailActive();
  if (railBound) return;
  railBound = true;

  document.querySelectorAll('.pa-rail-btn[data-rail-target]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const section = btn.dataset.railTarget;
      if (!section) return;
      document.querySelectorAll('.pa-rail-btn[data-rail-target]').forEach((el) => {
        el.classList.toggle('active', el === btn);
      });
      focusNavGroup(section);
    });
  });

  window.addEventListener('popstate', syncSidebarRailActive);
}
