import { getSettingsTabFromPath } from '../../core/router.js';
import { syncSidebarGroupNav } from './sidebarGroupNav.js';
import { syncSidebarRailActive } from './sidebarRailNav.js';

const NAV_BY_PATH = [
  ['/tool-categories', 'Tool Categories'],
  ['/recent-activities', 'Recent Activities'],
  ['/users', 'Users'],
  ['/contact-messages', 'Contact Messages'],
  ['/media-library', 'Media Library'],
  ['/technologies', 'Technologies'],
  ['/blog-categories', 'Blog Categories'],
  ['/categories', 'Categories'],
  ['/tags', 'Tags'],
  ['/testimonials', 'Testimonials'],
  ['/experience', 'Experience'],
  ['/blog-post', 'Blog Posts'],
  ['/projects', 'Projects'],
  ['/settings', 'Settings'],
  ['/tools', 'Tools'],
];

export function resolveActiveNav(path = window.location.pathname) {
  if (path === '/' || path === '') return 'Dashboard';
  for (const [needle, label] of NAV_BY_PATH) {
    if (path.includes(needle)) return label;
  }
  return null;
}

export function syncSidebarActiveNav() {
  const active = resolveActiveNav();
  if (!active) return;

  document.querySelectorAll('.pa-nav-subitem[data-nav]').forEach((item) => {
    item.classList.toggle('active', item.dataset.nav === active);
  });

  if (active === 'Settings' && window.location.pathname.includes('/settings')) {
    const tab = getSettingsTabFromPath();
    document.querySelectorAll('.pa-nav-subitem[data-settings-tab]').forEach((item) => {
      item.classList.toggle('active', item.dataset.settingsTab === tab);
    });
  } else {
    document.querySelectorAll('.pa-nav-subitem[data-settings-tab]').forEach((item) => {
      item.classList.remove('active');
    });
  }

  syncSidebarGroupNav();
  syncSidebarRailActive();
}

let sidebarNavBound = false;

function bindSidebarPrefetch() {
  const warm = typeof window.__paWarmPrefetchPath === 'function'
    ? window.__paWarmPrefetchPath
    : null;
  if (!warm) return;

  document.querySelectorAll('.pa-nav-subitem[href], .pa-logo-link[href]').forEach((link) => {
    link.addEventListener('pointerenter', () => {
      const href = link.getAttribute('href');
      if (href) warm(href);
    }, { passive: true });
  });
}

export function initSidebarNav() {
  syncSidebarActiveNav();
  if (!sidebarNavBound) {
    window.addEventListener('popstate', syncSidebarActiveNav);
    bindSidebarPrefetch();
    sidebarNavBound = true;
  }
}

export function syncSettingsNavTab(tab) {
  if (window.location.pathname.includes('/settings')) {
    syncSidebarActiveNav();
  }
}
