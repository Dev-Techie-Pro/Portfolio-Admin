import { Module } from '../../core/Module.js';
import { $id } from '../../utils/dom.js';
import { PAGE, getLoginPath } from '../../core/router.js';
import { eventBus } from '../../core/EventBus.js';
import { authService } from '../../core/AuthService.js';
import {
  clearNotifications,
  loadNotifications,
  markNotificationRead,
  renderNotifications,
} from './notifications.js';
import { showToast } from './toast.js';
import { closeConfirm, isConfirmOpen, initConfirmDialog, requestLogout } from './confirm.js';
import { anyPanelOpen, closePanels } from './panels.js';
import { closeAllCardMenus } from './cardMenu.js';
import { AddUserManager } from './AddUserManager.js';
import { CustomizationModule } from './CustomizationModule.js';
import { initSettingsNav } from './settingsNav.js';
import { initSidebarCollapse } from './sidebarCollapse.js';
import { initSidebarGroupNav } from './sidebarGroupNav.js';
import { storage } from '../../core/StorageService.js';
import { applyUserDisplay, applyRoleBasedAccess } from '../../utils/user-display.js';
import { uploadUserAvatar } from '../../utils/avatar-upload.js';
import {
  closeMobileHeaderSearch,
  isMobileHeaderSearchOpen,
  openMobileHeaderSearch,
} from './mobileHeaderSearch.js';
import { maybeShowRoleAccessModal } from './roleAccessModal.js';

const KNOWN_NAV_LABELS = [
  'Projects', 'Categories', 'Tags', 'Technologies', 'Tool Categories', 'Tools', 'Media Library',
  'Testimonials', 'Blog Posts', 'Blog Categories', 'Experience', 'Dashboard', 'Contact Messages',
  'Recent Activities', 'Settings', 'Users',
];

export class ShellModule extends Module {
  constructor() {
    super({ name: 'Shell' });
    this._sessionExpiryTimer = null;
    this.customization = new CustomizationModule();
    this.addUser = new AddUserManager({
      on: this.on.bind(this),
      closeUserMenu: () => {
        this._userMenuWrap?.classList.remove('open');
        $id('paUserMenu')?.setAttribute('aria-expanded', 'false');
      },
    });
  }

  async init() {
    initConfirmDialog();
    this.bindEvents();
    this.addUser.bindEvents();

    this.onBus('profile:updated', (profile) => {
      applyUserDisplay(profile);
      applyRoleBasedAccess(profile?.role);
      this.addUser.setProfileRole(profile?.role);
    });
    await Promise.all([
      this.loadUserSession(),
      this.customization.init(),
      loadNotifications(),
    ]);
    renderNotifications();
    initSettingsNav();
    initSidebarGroupNav();
    initSidebarCollapse();
  }

  async loadUserSession() {
    try {
      const { user, sessionExpiresAt } = await authService.session();
      if (!user) return;

      this.scheduleSessionExpiry(sessionExpiresAt);

      try {
        const profile = await authService.getProfile();
        applyUserDisplay({
          fullName: profile.fullName,
          username: profile.username,
          email: profile.email || user.email,
          role: profile.role || user.role,
          avatarUrl: profile.avatarUrl,
        });
        applyRoleBasedAccess(profile.role || user.role);
        this.addUser.setProfileRole(profile.role || user.role);
        void maybeShowRoleAccessModal({
          id: profile.id || user.id,
          role: profile.role || user.role,
        });
      } catch {
        applyUserDisplay(user);
        applyRoleBasedAccess(user.role);
        this.addUser.setProfileRole(user.role);
        void maybeShowRoleAccessModal({ id: user.id, role: user.role });
      }
    } catch (err) {
      console.warn('[Shell] session load failed:', err);
    }
  }

  scheduleSessionExpiry(sessionExpiresAt) {
    if (this._sessionExpiryTimer) {
      window.clearTimeout(this._sessionExpiryTimer);
      this._sessionExpiryTimer = null;
    }
    if (!sessionExpiresAt) return;

    const ms = new Date(sessionExpiresAt).getTime() - Date.now();
    if (ms <= 0) {
      void this.expireSessionNow();
      return;
    }
    this._sessionExpiryTimer = window.setTimeout(() => {
      void this.expireSessionNow();
    }, ms);
  }

  async expireSessionNow() {
    try {
      await authService.logout();
    } catch {
      /* still redirect */
    }
    window.location.assign(`${getLoginPath()}?session=expired`);
  }

  bindEvents() {
    const sidebar = $id('paSidebar');
    const overlay = $id('paSidebarOverlay');
    const toggle = $id('paMobileToggle');

    const closeMobileSidebar = () => {
      sidebar?.classList.remove('mobile-open');
      overlay?.classList.remove('visible');
    };
    this._closeMobileSidebar = closeMobileSidebar;

    this.on(toggle, 'click', () => {
      sidebar?.classList.add('mobile-open');
      overlay?.classList.add('visible');
    });
    this.on(overlay, 'click', closeMobileSidebar);

    const handleNavSelection = (item) => {
      const href = item.getAttribute('href');
      if (href === '#') return;
      document.querySelectorAll('.pa-nav-subitem').forEach((i) => i.classList.remove('active'));
      document.querySelectorAll('.pa-nav-toggle').forEach((i) => i.classList.remove('active'));
      item.classList.add('active');
      const label = item.dataset.nav;
      if (label && !KNOWN_NAV_LABELS.includes(label)) {
        showToast(`"${label}" section is not implemented in this demo`, 'info');
      }
      closeMobileSidebar();
    };

    document.querySelectorAll('.pa-nav-subitem[data-nav], .pa-nav-subitem[data-settings-tab]').forEach((item) => {
      this.on(item, 'click', (e) => {
        if (item.getAttribute('href') === '#') e.preventDefault();
        handleNavSelection(item);
      });
    });

    const userMenuWrap = $id('paUserMenuWrap');
    const userMenuBtn = $id('paUserMenu');
    this._userMenuWrap = userMenuWrap;

    if (userMenuBtn && userMenuWrap) {
      this.on(userMenuBtn, 'click', (e) => {
        e.stopPropagation();
        const isOpen = userMenuWrap.classList.toggle('open');
        userMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        if (isOpen) notifWrap?.classList.remove('open');
      });
      this.on(userMenuBtn, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const isOpen = userMenuWrap.classList.toggle('open');
          userMenuBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
      });
    }

    this.bindHeaderAvatarUpload();

    const userDropdownLogout = $id('paUserDropdownLogout');
    if (userDropdownLogout) {
      this.on(userDropdownLogout, 'click', (e) => {
        e.stopPropagation();
        userMenuWrap?.classList.remove('open');
        userMenuBtn?.setAttribute('aria-expanded', 'false');
        this.handleLogout();
      });
    }

    const logoutBtn = $id('paLogoutBtn');
    if (logoutBtn) {
      this.on(logoutBtn, 'click', () => this.handleLogout());
    }

    const notifWrap = $id('paNotifWrap');
    const notifBtn = $id('paNotifBtn');
    this._notifWrap = notifWrap;
    if (notifBtn && notifWrap) {
      this.on(notifBtn, 'click', (e) => {
        e.stopPropagation();
        const opening = !notifWrap.classList.contains('open');
        notifWrap.classList.toggle('open');
        if (notifWrap.classList.contains('open')) {
          userMenuWrap?.classList.remove('open');
          userMenuBtn?.setAttribute('aria-expanded', 'false');
          if (opening) void loadNotifications();
        }
      });
      this.on(notifBtn, 'keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          notifWrap.classList.toggle('open');
        }
      });
      this.on($id('paNotifClearBtn'), 'click', (e) => {
        e.stopPropagation();
        if (document.body.classList.contains('pa-role-readonly')) {
          showToast('Viewers cannot clear notifications.', 'warning', 2200);
          return;
        }
        void clearNotifications().then(() => {
          showToast('Notifications cleared', 'info', 1800);
        });
      });

      const notifList = $id('paNotifList');
      if (notifList) {
        this.on(notifList, 'click', (e) => {
          const item = e.target.closest('[data-notif-id]');
          if (!item) return;
          const id = item.dataset.notifId;
          const link = item.dataset.notifLink;
          void markNotificationRead(id).then(() => {
            if (link) window.location.href = link;
          });
        });
      }
    }

    this.onBus('notifications:updated', () => {
      renderNotifications();
    });

    this.onBus('storage:invalidated', (key) => {
      if (key === 'pa_notifications' || key === 'pa_recent_activities') {
        void loadNotifications({ silent: true });
      }
    });

    this.on(document, 'click', (e) => {
      if (notifWrap && !notifWrap.contains(e.target)) notifWrap.classList.remove('open');
      if (userMenuWrap && !userMenuWrap.contains(e.target)) {
        if (!userMenuWrap.classList.contains('pa-user-menu--locked')) {
          userMenuWrap.classList.remove('open');
          userMenuBtn?.setAttribute('aria-expanded', 'false');
        }
      }
      if (!e.target.closest('.pa-card-actions, .pa-cat-card__list-actions, .pa-cat-card__footer-more, .pa-proj-card__head-more, .pa-proj-card__list-more, .pa-proj-card__list-actions, .pa-media-card__thumb-more, .pa-media-card__footer-more, .pa-media-card__list-more, .pa-media-card__list-actions')) closeAllCardMenus();
    });

    this.on(document, 'keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === 'k') {
        e.preventDefault();
        const search = $id('paSearchInput') || $id('paCatSearchInput');
        if (search && window.innerWidth <= 899) openMobileHeaderSearch();
        else search?.focus();
      }
      if (e.key === 'Escape') {
        if (isMobileHeaderSearchOpen()) {
          closeMobileHeaderSearch();
        } else if (isConfirmOpen()) {
          closeConfirm();
        } else if ($id('paBulkConfirmOverlay')?.classList.contains('visible')) {
          eventBus.emit('bulk-confirm:close');
        } else if (anyPanelOpen()) {
          closePanels();
        } else {
          closeAllCardMenus();
          notifWrap?.classList.remove('open');
          userMenuWrap?.classList.remove('open');
          userMenuBtn?.setAttribute('aria-expanded', 'false');
          closeMobileSidebar();
        }
      }
      if (
        e.key?.toLowerCase() === 'n' &&
        !anyPanelOpen() &&
        !document.activeElement.matches('input, textarea, select, [contenteditable]')
      ) {
        eventBus.emit('shortcut:new-item', { page: PAGE });
      }
    });
  }

  bindHeaderAvatarUpload() {
    const avatarBtn = $id('paUserDropdownAvatar');
    const userMenuWrap = this._userMenuWrap || $id('paUserMenuWrap');
    const userMenuBtn = $id('paUserMenu');
    if (!avatarBtn) return;

    let avatarInput = $id('paHeaderAvatarInput');
    if (!avatarInput) {
      avatarInput = document.createElement('input');
      avatarInput.type = 'file';
      avatarInput.id = 'paHeaderAvatarInput';
      avatarInput.accept = 'image/png,image/jpeg,image/webp';
      avatarInput.hidden = true;
      document.body.appendChild(avatarInput);
    }

    const lockMenu = () => {
      userMenuWrap?.classList.add('pa-user-menu--locked', 'open');
      userMenuBtn?.setAttribute('aria-expanded', 'true');
    };

    const unlockMenu = (closeAfter = false) => {
      userMenuWrap?.classList.remove('pa-user-menu--locked');
      if (closeAfter) {
        userMenuWrap?.classList.remove('open');
        userMenuBtn?.setAttribute('aria-expanded', 'false');
      }
    };

    this.on(avatarBtn, 'click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      lockMenu();
      avatarInput.click();
    });

    this.on(avatarInput, 'cancel', () => {
      unlockMenu(false);
      avatarInput.value = '';
    });

    // Fallback when the file dialog is dismissed without a selection.
    this.on(window, 'focus', () => {
      if (!userMenuWrap?.classList.contains('pa-user-menu--locked')) return;
      window.setTimeout(() => {
        if (!avatarInput.files?.length && !avatarBtn.classList.contains('is-uploading')) {
          unlockMenu(false);
        }
      }, 280);
    });

    this.on(avatarInput, 'change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) {
        unlockMenu(false);
        e.target.value = '';
        return;
      }

      lockMenu();
      await uploadUserAvatar(file, {
        onComplete: (profile) => unlockMenu(!!profile),
      });
      e.target.value = '';
    });
  }

  handleLogout() {
    requestLogout(async () => {
      showToast('Logging out...', 'info', 1500);
      try {
        await authService.logout();
      } catch (err) {
        console.warn('[Shell] logout failed:', err);
      }
      try {
        await storage.clearPersistentCache();
      } catch (err) {
        console.warn('[Shell] cache clear failed:', err);
      }
      window.location.href = getLoginPath();
    });
  }

  destroy() {
    this.customization.destroy();
    super.destroy();
  }
}