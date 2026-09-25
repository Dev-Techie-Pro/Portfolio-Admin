import { getCurrentPage } from './core/router.js';

import { bodyLoader } from './core/BodyLoader.js';

import { storage } from './core/StorageService.js';

import { ShellModule } from './modules/shell/ShellModule.js';

import { $id, $all, clearDomCache } from './utils/dom.js';

import { initConfirmDialog } from './modules/shell/confirm.js';

import { initUserCredentialsPanel } from './utils/userCredentialsPanel.js';

import { closePanels, activateTab } from './modules/shell/panels.js';

import { initMobileHeaderSearch } from './modules/shell/mobileHeaderSearch.js';

import { initSettingsNav } from './modules/shell/settingsNav.js';

import { initSidebarNav, syncSidebarActiveNav } from './modules/shell/sidebarNav.js';

import { initSidebarGroupNav } from './modules/shell/sidebarGroupNav.js';

import { initSidebarCollapse } from './modules/shell/sidebarCollapse.js';

import { initSidebarRailNav } from './modules/shell/sidebarRailNav.js';

import { initAuthAppearance } from './utils/appearanceApply.js';

import { bootstrapAppearanceFromCache } from './utils/appearanceCache.js';

import { initAllPaSelects } from './utils/paSelect.js';

import { initPasswordToggles } from './utils/password-toggle.js';



const AUTH_PAGES = new Set(['login', 'forgot-password', 'reset-password']);



/** Keys each page module reads during load() — synced via public/js/prefetch-config.js */

const PREFETCH_BY_PAGE = window.__paPrefetchConfig?.PAGE_KEYS || {};



type PageModuleClass = new () => {

  load: () => Promise<void>;

  render: () => void;

  bindEvents: () => void;

  destroy?: () => void;

};



async function loadPageModuleClass(page: string): Promise<PageModuleClass | null> {

  switch (page) {

    case 'dashboard':

      return (await import('./modules/dashboard/DashboardModule.js')).DashboardModule;

    case 'projects':

      return (await import('./modules/projects/ProjectsModule.js')).ProjectsModule;

    case 'categories':

      return (await import('./modules/categories/CategoriesModule.js')).CategoriesModule;

    case 'tags':

      return (await import('./modules/tags/TagsModule.js')).TagsModule;

    case 'technologies':

      return (await import('./modules/technologies/TechnologiesModule.js')).TechnologiesModule;

    case 'tool-categories':

      return (await import('./modules/tool-categories/ToolCategoriesModule.js')).ToolCategoriesModule;

    case 'blog-categories':

      return (await import('./modules/blog-categories/BlogCategoriesModule.js')).BlogCategoriesModule;

    case 'tools':

      return (await import('./modules/tools/ToolsModule.js')).ToolsModule;

    case 'media':

      return (await import('./modules/media/MediaModule.js')).MediaModule;

    case 'testimonials':

      return (await import('./modules/testimonials/TestimonialsModule.js')).TestimonialsModule;

    case 'blogposts':

      return (await import('./modules/blog/BlogModule.js')).BlogModule;

    case 'experience':

      return (await import('./modules/experience/ExperienceModule.js')).ExperienceModule;

    case 'contact-messages':

      return (await import('./modules/contact-messages/ContactMessagesModule.js')).ContactMessagesModule;

    case 'users':

      return (await import('./modules/users/UsersModule.js')).UsersModule;

    case 'recent-activities':

      return (await import('./modules/recent-activities/RecentActivitiesModule.js')).RecentActivitiesModule;

    case 'settings':

      return (await import('./modules/settings/SettingsModule.js')).SettingsModule;

    case 'login':

      return (await import('./modules/auth/LoginModule.js')).LoginModule;

    case 'forgot-password':

      return (await import('./modules/auth/ForgotPasswordModule.js')).ForgotPasswordModule;

    case 'reset-password':

      return (await import('./modules/auth/ResetPasswordModule.js')).ResetPasswordModule;

    default:

      return null;

  }

}



let activePageModule: InstanceType<PageModuleClass> | null = null;

let shellInstance: ShellModule | null = null;

let bootPromise: Promise<void> | null = null;

let appChromeInitialized = false;



function bindGlobalPanelChrome() {

  initUserCredentialsPanel();

  $all('.pa-panel-tab').forEach((btn) => {

    btn.addEventListener('click', () => {

      activateTab(btn.dataset.panel, btn.dataset.tab);

    });

  });

  $id('paPanelOverlay')?.addEventListener('click', (e) => {

    if (e.target.id === 'paPanelOverlay') closePanels();

  });

}



let quickAddModule: { bindEvents: () => void } | null = null;



async function bindQuickAddButton(pageModule: InstanceType<PageModuleClass>) {

  if (quickAddModule) return;

  const { QuickAddModule } = await import('./modules/dashboard/QuickAddModule.js');

  quickAddModule = new QuickAddModule(pageModule);

  quickAddModule.bindEvents();

}



/**

 * Load page data, hide loader, then paint DOM so charts are not blocked by overlay.

 */

async function initPageModule(pageModule: InstanceType<PageModuleClass>) {

  await pageModule.load();

  bodyLoader.end();

  bodyLoader.reset();

  await new Promise<void>((resolve) => {

    requestAnimationFrame(() => {

      pageModule.render();

      pageModule.bindEvents();

      resolve();

    });

  });

}



async function ensureShell() {

  if (!shellInstance) {

    shellInstance = new ShellModule();

    await shellInstance.init().catch((err) => {

      console.warn('[main] shell init failed:', err);

    });

  }

}



function initAppChrome() {

  if (appChromeInitialized) {

    initSettingsNav();

    syncSidebarActiveNav();

    return;

  }

  appChromeInitialized = true;

  initSettingsNav();

  initSidebarNav();

  initSidebarGroupNav();

  initSidebarRailNav();

  initSidebarCollapse();

  initMobileHeaderSearch();

}



async function bootAuthPage(ModuleClass: PageModuleClass, page: string) {

  document.documentElement.classList.add('pa-auth-route');



  clearDomCache();

  initConfirmDialog();

  await initAuthAppearance();



  const pageModule = new ModuleClass();

  await pageModule.load();

  pageModule.render();

  pageModule.bindEvents();



  activePageModule = pageModule;

  window.__paDebug = { pageModule, page };

}



async function bootAppPage(ModuleClass: PageModuleClass, page: string) {

  bodyLoader.mount();

  bodyLoader.begin('Loading your data…');



  const prefetchKeys = PREFETCH_BY_PAGE[page];

  if (prefetchKeys?.length) {

    await storage.hydrateFromPersistentCache(prefetchKeys);

    storage.prefetch(prefetchKeys);

  }



  clearDomCache();

  initConfirmDialog();



  const pageModule = new ModuleClass();

  const bootstrapPending = storage.isBootstrapPending();



  await Promise.all([initPageModule(pageModule), ensureShell()]);



  initAllPaSelects();

  bindGlobalPanelChrome();

  if (page === 'dashboard') void bindQuickAddButton(pageModule);

  initAppChrome();



  activePageModule = pageModule;

  window.__paDebug = { pageModule, page };



  if (bootstrapPending) {

    void storage.waitForBootstrap().then(() => {

      if (activePageModule === pageModule && typeof pageModule.render === 'function') {

        pageModule.render();

      }

    });

  }

}



async function runBoot() {

  bootstrapAppearanceFromCache();

  initPasswordToggles();



  const page = getCurrentPage();

  const ModuleClass = await loadPageModuleClass(page);

  if (!ModuleClass) {

    console.warn(`[main] no module registered for page "${page}"`);

    bodyLoader.reset();

    return;

  }



  try {

    if (AUTH_PAGES.has(page)) {

      await bootAuthPage(ModuleClass, page);

    } else {

      await bootAppPage(ModuleClass, page);

    }

  } catch (err) {

    if (!AUTH_PAGES.has(page)) {

      bodyLoader.end();

      bodyLoader.reset();

    }

    throw err;

  }

}



/** Tear down the active page module before a client-side route swap. */

export function teardownPortfolioApp(options: { keepShell?: boolean } = {}) {

  const keepShell = options.keepShell ?? false;



  if (activePageModule?.destroy) {

    try {

      activePageModule.destroy();

    } catch (err) {

      console.warn('[main] page teardown failed:', err);

    }

  }

  activePageModule = null;

  quickAddModule = null;



  if (!keepShell && shellInstance) {

    shellInstance.destroy();

    shellInstance = null;

    appChromeInitialized = false;

  }



  clearDomCache();

  bodyLoader.reset();

  closePanels();

}



/** Boot (or re-boot) the legacy module for the current URL. */

export function bootPortfolioApp() {

  if (bootPromise) return bootPromise;



  bootPromise = (async () => {

    const keepShell = Boolean(window.__paBooted);

    teardownPortfolioApp({ keepShell });

    window.__paBooted = true;

    if (typeof window.__paStartPrefetch === 'function') {

      window.__paStartPrefetch(window.location.pathname);

    }

    await runBoot();

  })()

    .catch((err) => {

      window.__paBooted = false;

      bodyLoader.reset();

      console.error('[main] fatal error during boot:', err);

      throw err;

    })

    .finally(() => {

      bootPromise = null;

    });



  return bootPromise;

}



window.__paBootPortfolioApp = bootPortfolioApp;

window.__paTeardownPortfolioApp = teardownPortfolioApp;


