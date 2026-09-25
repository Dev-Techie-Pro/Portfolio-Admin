import { $id, escapeHtml } from '../../utils/dom.js';
import { showToast, showStatusToast } from '../shell/toast.js';
import { requestConfirm } from '../shell/confirm.js';
import { closeAllCardMenus, toggleCardMenu } from '../shell/cardMenu.js';
import { setupAllPasswordToggles } from '../../utils/password-toggle.js';

const UNCHANGED_SECRET = '__UNCHANGED__';

const SECRET_FIELDS = new Set([
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CRON_SECRET',
  'SMTP_PASS',
]);

const ENV_FIELD_MAP = {
  NEXT_PUBLIC_SUPABASE_URL: 'envNextPublicSupabaseUrl',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'envNextPublicSupabaseAnonKey',
  SUPABASE_SERVICE_ROLE_KEY: 'envSupabaseServiceRoleKey',
  NEXT_PUBLIC_SITE_URL: 'envNextPublicSiteUrl',
  CRON_SECRET: 'envCronSecret',
  SMTP_HOST: 'envSmtpHost',
  SMTP_PORT: 'envSmtpPort',
  SMTP_USER: 'envSmtpUser',
  SMTP_PASS: 'envSmtpPass',
  SMTP_FROM: 'envSmtpFrom',
  EMAIL_BRAND_NAME: 'envEmailBrandName',
  EMAIL_BRAND_ROLE: 'envEmailBrandRole',
  EMAIL_PORTFOLIO_LABEL: 'envEmailPortfolioLabel',
  EMAIL_PORTFOLIO_URL: 'envEmailPortfolioUrl',
  EMAIL_GITHUB_URL: 'envEmailGithubUrl',
  EMAIL_LINKEDIN_URL: 'envEmailLinkedinUrl',
};

/** @type {Record<string, { desc: string, category: string, icon: string, tone: string }>} */
const TABLE_META = {
  sites: { desc: 'Site configuration records', category: 'system', icon: 'ri-global-line', tone: 'tone-blue' },
  profiles: { desc: 'User profile data', category: 'auth', icon: 'ri-user-line', tone: 'tone-green' },
  site_settings: { desc: 'Dashboard and site preferences', category: 'system', icon: 'ri-settings-3-line', tone: 'tone-orange' },
  notification_preferences: { desc: 'Per-user notification settings', category: 'system', icon: 'ri-notification-3-line', tone: 'tone-purple' },
  security_settings: { desc: 'Account security configuration', category: 'auth', icon: 'ri-shield-keyhole-line', tone: 'tone-green' },
  two_factor_backup_codes: { desc: 'MFA backup codes', category: 'auth', icon: 'ri-key-2-line', tone: 'tone-green' },
  user_sessions: { desc: 'Active user sessions', category: 'auth', icon: 'ri-login-circle-line', tone: 'tone-green' },
  categories: { desc: 'Project category definitions', category: 'content', icon: 'ri-folder-line', tone: 'tone-orange' },
  media_assets: { desc: 'Media files and assets', category: 'content', icon: 'ri-image-line', tone: 'tone-purple' },
  projects: { desc: 'Portfolio project entries', category: 'content', icon: 'ri-apps-line', tone: 'tone-orange' },
  project_tags: { desc: 'Project tag associations', category: 'content', icon: 'ri-price-tag-3-line', tone: 'tone-teal' },
  project_gallery_images: { desc: 'Project gallery images', category: 'content', icon: 'ri-gallery-line', tone: 'tone-purple' },
  technologies: { desc: 'Technology stack items', category: 'content', icon: 'ri-code-s-slash-line', tone: 'tone-blue' },
  experience_entries: { desc: 'Work experience records', category: 'content', icon: 'ri-briefcase-line', tone: 'tone-teal' },
  testimonials: { desc: 'Client testimonials', category: 'content', icon: 'ri-chat-quote-line', tone: 'tone-green' },
  blog_posts: { desc: 'Blog post content', category: 'content', icon: 'ri-article-line', tone: 'tone-orange' },
  blog_post_tags: { desc: 'Blog post tag links', category: 'content', icon: 'ri-hashtag', tone: 'tone-teal' },
  blog_categories: { desc: 'Blog post categories', category: 'content', icon: 'ri-bookmark-line', tone: 'tone-purple' },
  contact_messages: { desc: 'Inbound contact form messages', category: 'communication', icon: 'ri-mail-line', tone: 'tone-blue' },
  contact_message_replies: { desc: 'Replies to contact messages', category: 'communication', icon: 'ri-reply-line', tone: 'tone-blue' },
  recent_activities: { desc: 'Dashboard activity feed', category: 'system', icon: 'ri-history-line', tone: 'tone-orange' },
  login_activity: { desc: 'User login audit log', category: 'auth', icon: 'ri-fingerprint-line', tone: 'tone-green' },
  tool_categories: { desc: 'Tool category definitions', category: 'content', icon: 'ri-folder-settings-line', tone: 'tone-teal' },
  tool_items: { desc: 'Tools and utilities', category: 'content', icon: 'ri-tools-line', tone: 'tone-orange' },
  user_notifications: { desc: 'In-app user notifications', category: 'system', icon: 'ri-bell-line', tone: 'tone-purple' },
  backup_snapshots: { desc: 'Stores backup snapshot information', category: 'system', icon: 'ri-database-2-line', tone: 'tone-blue' },
};

const CATEGORY_LABELS = {
  all: 'All Categories',
  content: 'Content',
  auth: 'Auth & Security',
  system: 'System',
  communication: 'Communication',
};

function formatBytes(bytes) {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  const scaled = value / 1024 ** index;
  return `${scaled.toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDateTime(value) {
  if (!value) return { date: '—', time: '', relative: '' };
  try {
    const d = new Date(value);
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    let relative = '';
    if (diffHours < 1) relative = 'Just now';
    else if (diffHours < 24) relative = `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    else {
      const days = Math.floor(diffHours / 24);
      relative = `${days} day${days === 1 ? '' : 's'} ago`;
    }
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
      relative,
    };
  } catch {
    return { date: '—', time: '', relative: '' };
  }
}

function parseDownloadFilename(contentDisposition, fallback) {
  if (!contentDisposition) return fallback;
  const match = /filename="([^"]+)"/i.exec(contentDisposition);
  return match?.[1] || fallback;
}

function triggerBlobDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function getTableMeta(name) {
  const known = TABLE_META[name];
  if (known) return known;
  const label = name.replace(/_/g, ' ');
  return {
    desc: `${label.charAt(0).toUpperCase()}${label.slice(1)} data`,
    category: 'system',
    icon: 'ri-table-line',
    tone: 'tone-blue',
  };
}

function sizeBucket(bytes) {
  const value = Number(bytes) || 0;
  if (value <= 0) return 'small';
  if (value < 100 * 1024) return 'small';
  if (value < 1024 * 1024) return 'medium';
  return 'large';
}

type EventBinder = (el: Element, event: string, handler: EventListener) => void;

type ProfileGetter = () => Promise<{ role?: string } | null>;

type DbTableInfo = {
  name: string;
  rowCount?: number;
  sizeBytes?: number;
};

type ExportHistoryItem = {
  id: string;
  filename?: string;
  size_bytes?: number;
  created_at?: string;
  record_counts?: {
    _meta?: {
      exportKind?: string;
    };
    [key: string]: number | { exportKind?: string } | undefined;
  };
};

type EnvConfig = {
  source?: string;
  targetFile?: string;
  writable?: boolean;
  values?: Record<string, string>;
  message?: string;
};

type SystemManagerState = {
  tables: DbTableInfo[];
  history: ExportHistoryItem[];
  selectedTables: Set<string>;
  focusedTable: string | null;
  tableFilter: string;
  categoryFilter: string;
  sizeFilter: string;
  viewMode: 'grid' | 'list';
  page: number;
  pageSize: number;
  exportRunning: boolean;
  env: EnvConfig | null;
};

type SystemManagerOptions = {
  on: EventBinder;
  getProfile?: ProfileGetter;
};

export class SystemManager {
  on: EventBinder;
  getProfile?: ProfileGetter;
  state: SystemManagerState;
  _bound: boolean;

  constructor({ on, getProfile }: SystemManagerOptions) {
    this.on = on;
    this.getProfile = getProfile;
    this.state = {
      tables: [],
      history: [],
      selectedTables: new Set(),
      focusedTable: null,
      tableFilter: '',
      categoryFilter: 'all',
      sizeFilter: 'all',
      viewMode: 'grid',
      page: 1,
      pageSize: 10,
      exportRunning: false,
      env: null,
    };
    this._bound = false;
  }

  bindEvents() {
    if (this._bound) return;
    this._bound = true;

    const refreshBtn = $id('systemBackupRefreshBtn');
    if (refreshBtn) this.on(refreshBtn, 'click', () => { void this.loadTables(); });

    const searchInput = $id('systemTableSearch');
    if (searchInput) {
      this.on(searchInput, 'input', (e) => {
        const target = e.target as HTMLInputElement;
        this.state.tableFilter = target.value.trim().toLowerCase();
        this.state.page = 1;
        this.renderTables();
      });
    }

    const categoryFilter = $id('systemTableCategoryFilter');
    if (categoryFilter) {
      this.on(categoryFilter, 'change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.state.categoryFilter = target.value;
        this.state.page = 1;
        this.renderTables();
      });
    }

    const sizeFilter = $id('systemTableSizeFilter');
    if (sizeFilter) {
      this.on(sizeFilter, 'change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.state.sizeFilter = target.value;
        this.state.page = 1;
        this.renderTables();
      });
    }

    const selectAllBtn = $id('systemTableSelectAll');
    if (selectAllBtn) this.on(selectAllBtn, 'click', () => this.selectAllVisibleTables());

    const clearAllBtn = $id('systemTableClearAll');
    if (clearAllBtn) this.on(clearAllBtn, 'click', () => this.clearSelectedTables());

    const masterCheck = $id('systemTableMasterCheck');
    if (masterCheck) {
      this.on(masterCheck, 'change', (e) => {
        const target = e.target as HTMLInputElement;
        if (target.checked) this.selectAllVisibleTables();
        else this.clearSelectedTables();
      });
    }

    const gridViewBtn = $id('systemTableGridViewBtn');
    if (gridViewBtn) this.on(gridViewBtn, 'click', () => this.setViewMode('grid'));

    const listViewBtn = $id('systemTableListViewBtn');
    if (listViewBtn) this.on(listViewBtn, 'click', () => this.setViewMode('list'));

    const pageSizeSelect = $id('systemTablePageSize');
    if (pageSizeSelect) {
      this.on(pageSizeSelect, 'change', (e) => {
        const target = e.target as HTMLSelectElement;
        this.state.pageSize = parseInt(target.value, 10) || 10;
        this.state.page = 1;
        this.renderTables();
      });
    }

    const exportSqlBtn = $id('systemExportSqlBtn');
    if (exportSqlBtn) this.on(exportSqlBtn, 'click', () => { void this.exportSqlBackup(); });

    const exportSchemaBtn = $id('systemExportSchemaBtn');
    if (exportSchemaBtn) this.on(exportSchemaBtn, 'click', () => { void this.downloadSchemaGuide(); });

    const bulkExportSqlBtn = $id('systemBulkExportSqlBtn');
    if (bulkExportSqlBtn) this.on(bulkExportSqlBtn, 'click', () => { void this.exportSqlBackup(); });

    const bulkExportSchemaBtn = $id('systemBulkExportSchemaBtn');
    if (bulkExportSchemaBtn) this.on(bulkExportSchemaBtn, 'click', () => { void this.downloadSchemaGuide(); });

    const gridBody = $id('systemTableGridBody');
    if (gridBody) {
      this.on(gridBody, 'change', (e) => {
        const target = e.target as HTMLElement;
        const checkbox = target.closest('[data-table-select]') as HTMLInputElement | null;
        if (!checkbox || checkbox.tagName !== 'INPUT') return;
        e.stopPropagation();
        this.toggleTableSelection(checkbox.dataset.tableName, checkbox.checked);
        this.focusTable(checkbox.dataset.tableName);
      });
      this.on(gridBody, 'click', (e) => {
        const target = e.target as HTMLElement;
        const menuItem = target.closest('[data-table-action]') as HTMLElement | null;
        if (menuItem) {
          e.preventDefault();
          e.stopPropagation();
          closeAllCardMenus();
          this.handleTableAction(menuItem.dataset.tableName, menuItem.dataset.tableAction);
          return;
        }
        const menuBtn = target.closest('[data-table-menu-btn]') as HTMLElement | null;
        if (menuBtn) {
          e.preventDefault();
          e.stopPropagation();
          const menu = menuBtn.parentElement?.querySelector('.pa-card-menu');
          if (menu) toggleCardMenu(menu, menuBtn);
          return;
        }
        const selectBox = target.closest('[data-table-select]') as HTMLElement | null;
        if (selectBox) {
          e.stopPropagation();
          const name = selectBox.dataset.tableName;
          this.toggleTableSelection(name, !this.state.selectedTables.has(name));
          this.focusTable(name);
          return;
        }
        if (target.closest('.pa-bkp-table-card-actions, .pa-card-menu')) return;
        const card = target.closest('[data-table-card]') as HTMLElement | null;
        if (!card) return;
        this.checkTable(card.dataset.tableName);
      });
      this.on(gridBody, 'keydown', (e) => {
        const event = e as KeyboardEvent;
        const target = event.target as HTMLElement;
        const selectBox = target.closest('[data-table-select]') as HTMLElement | null;
        if (!selectBox || selectBox.tagName === 'INPUT') return;
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        const name = selectBox.dataset.tableName;
        this.toggleTableSelection(name, !this.state.selectedTables.has(name));
        this.focusTable(name);
      });
    }

    const tableList = $id('systemTableListBody');
    if (tableList) {
      this.on(tableList, 'change', (e) => {
        const target = e.target as HTMLElement;
        const checkbox = target.closest('[data-table-select]') as HTMLInputElement | null;
        if (!checkbox || checkbox.tagName !== 'INPUT') return;
        e.stopPropagation();
        this.toggleTableSelection(checkbox.dataset.tableName, checkbox.checked);
        this.focusTable(checkbox.dataset.tableName);
      });
      this.on(tableList, 'click', (e) => {
        const target = e.target as HTMLElement;
        const row = target.closest('[data-table-row]') as HTMLElement | null;
        if (!row) return;
        const actionBtn = target.closest('[data-table-action]') as HTMLElement | null;
        if (actionBtn) {
          e.preventDefault();
          e.stopPropagation();
          this.handleTableAction(actionBtn.dataset.tableName, actionBtn.dataset.tableAction);
          return;
        }
        if (target.closest('[data-table-select]')) return;
        this.checkTable(row.dataset.tableName);
      });
    }

    const historyBody = $id('systemExportHistoryBody');
    if (historyBody) {
      this.on(historyBody, 'click', (e) => {
        const target = e.target as HTMLElement;
        const deleteBtn = target.closest('[data-export-action="delete"]') as HTMLElement | null;
        if (!deleteBtn) return;
        e.preventDefault();
        this.confirmDeleteExport(deleteBtn.dataset.exportId);
      });
    }

    const viewStructureBtn = $id('systemDbViewStructureBtn');
    if (viewStructureBtn) this.on(viewStructureBtn, 'click', () => this.viewTableStructure());

    const exportTableBtn = $id('systemDbExportTableBtn');
    if (exportTableBtn) {
      this.on(exportTableBtn, 'click', () => {
        if (this.state.focusedTable) void this.exportSingleTable(this.state.focusedTable);
      });
    }

    const sqlEditorBtn = $id('systemDbSqlEditorBtn');
    if (sqlEditorBtn) {
      this.on(sqlEditorBtn, 'click', () => {
        if (this.state.focusedTable) this.copySqlQuery(this.state.focusedTable);
      });
    }

    const reloadBtn = $id('systemEnvReloadBtn');
    if (reloadBtn) this.on(reloadBtn, 'click', () => { void this.loadEnvironment(); });

    const form = $id('systemEnvForm');
    if (form) {
      this.on(form, 'submit', (e) => {
        e.preventDefault();
        void this.saveEnvironment();
      });
    }

    setupAllPasswordToggles($id('systemEnvForm'));
  }

  setViewMode(mode) {
    this.state.viewMode = mode;
    this.syncViewMode();
    this.renderTables();
  }

  syncViewMode() {
    const mode = this.state.viewMode;
    const gridBtn = $id('systemTableGridViewBtn');
    const listBtn = $id('systemTableListViewBtn');
    const gridWrap = $id('systemTableGridWrap');
    const listWrap = $id('systemTableListWrap');
    if (gridBtn) gridBtn.classList.toggle('active', mode === 'grid');
    if (listBtn) listBtn.classList.toggle('active', mode === 'list');
    if (gridWrap) {
      gridWrap.hidden = mode !== 'grid';
      gridWrap.classList.toggle('is-active-view', mode === 'grid');
    }
    if (listWrap) {
      listWrap.hidden = mode !== 'list';
      listWrap.classList.toggle('is-active-view', mode === 'list');
    }
  }

  async ensureAdminAccess() {
    const profile = await this.getProfile?.();
    if (!profile) return false;
    if (!['super_admin', 'admin'].includes(profile.role)) {
      showToast('Only administrators can access system settings.', 'danger');
      return false;
    }
    return true;
  }

  async fetchJson(url: string, options?: RequestInit & { headers?: Record<string, string> }) {
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options?.headers || {}),
      },
      ...options,
    });
    if (res.status === 401) {
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText || 'Request failed');
    return data;
  }

  async load() {
    if (!(await this.ensureAdminAccess())) {
      this.renderAccessDenied();
      return;
    }

    this.bindEvents();
    this.syncViewMode();
    this.populateCategoryFilter();
    await Promise.all([
      this.loadTables(),
      this.loadEnvironment(),
    ]);
  }

  populateCategoryFilter() {
    const select = $id('systemTableCategoryFilter');
    if (!select) return;
    const options = Object.entries(CATEGORY_LABELS).map(([value, label]) =>
      `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`,
    );
    select.innerHTML = options.join('');
  }

  renderAccessDenied() {
    const panel = document.querySelector('.pa-tab-panel[data-content="system"]');
    if (!panel) return;
    panel.innerHTML = '<div class="pa-session-empty">You do not have permission to view system settings.</div>';
  }

  getVisibleTables() {
    const filter = this.state.tableFilter;
    const category = this.state.categoryFilter;
    const size = this.state.sizeFilter;

    return this.state.tables.filter((table) => {
      const meta = getTableMeta(table.name);
      if (filter && !table.name.toLowerCase().includes(filter) && !meta.desc.toLowerCase().includes(filter)) {
        return false;
      }
      if (category !== 'all' && meta.category !== category) return false;
      if (size !== 'all' && sizeBucket(table.sizeBytes) !== size) return false;
      return true;
    });
  }

  getPageTables() {
    const visible = this.getVisibleTables();
    const start = (this.state.page - 1) * this.state.pageSize;
    return { visible, pageItems: visible.slice(start, start + this.state.pageSize), totalPages: Math.max(1, Math.ceil(visible.length / this.state.pageSize)) };
  }

  getTotalSizeBytes() {
    return this.state.tables.reduce((sum, table) => sum + (Number(table.sizeBytes) || 0), 0);
  }

  getSelectedSizeBytes() {
    return this.state.tables
      .filter((table) => this.state.selectedTables.has(table.name))
      .reduce((sum, table) => sum + (Number(table.sizeBytes) || 0), 0);
  }

  selectAllVisibleTables() {
    for (const table of this.getVisibleTables()) {
      this.state.selectedTables.add(table.name);
    }
    this.renderTables();
  }

  clearSelectedTables() {
    this.state.selectedTables.clear();
    this.renderTables();
  }

  toggleTableSelection(name, selected) {
    if (!name) return;
    if (selected) this.state.selectedTables.add(name);
    else this.state.selectedTables.delete(name);
    this.renderTables();
  }

  focusTable(name) {
    if (!name) return;
    this.state.focusedTable = name;
    this.renderTables();
    this.renderSidebar();
  }

  checkTable(name) {
    if (!name) return;
    this.state.selectedTables.add(name);
    this.focusTable(name);
  }

  renderTableCheckbox(tableName, selected, mode = 'grid') {
    const safeName = escapeHtml(tableName);
    if (mode === 'list') {
      return `<input type="checkbox" class="pa-msg-bulk-checkbox" data-table-select data-table-name="${safeName}" ${selected ? 'checked' : ''} aria-label="Include ${safeName}" />`;
    }
    return `<div class="pa-select-checkbox${selected ? ' selected' : ''}" data-table-select data-table-name="${safeName}" role="checkbox" aria-checked="${selected}" aria-label="Include ${safeName}" tabindex="0"><i class="${selected ? 'ri-checkbox-fill' : 'ri-checkbox-blank-line'}"></i></div>`;
  }

  handleTableAction(name, action) {
    if (!name || !action) return;
    if (action === 'focus') this.focusTable(name);
    else if (action === 'export') void this.exportSingleTable(name);
    else if (action === 'sql') this.copySqlQuery(name);
  }

  renderTableCardMenu(tableName) {
    const safeName = escapeHtml(tableName);
    return `<div class="pa-bkp-table-card-actions pa-card-actions">
      <button type="button" class="pa-action-btn pa-action-more" data-table-menu-btn data-table-name="${safeName}" title="More options" aria-label="More options for ${safeName}"><i class="ri-more-2-fill"></i></button>
      <div class="pa-card-menu" data-table-name="${safeName}">
        <div class="pa-card-menu-item" data-table-action="focus" data-table-name="${safeName}"><i class="ri-eye-line"></i> View Details</div>
        <div class="pa-card-menu-item" data-table-action="sql" data-table-name="${safeName}"><i class="ri-code-line"></i> Copy SQL Query</div>
        <div class="pa-card-menu-item" data-table-action="export" data-table-name="${safeName}"><i class="ri-download-2-line"></i> Export Data</div>
      </div>
    </div>`;
  }

  updateSelectionMeta() {
    const countEl = $id('systemTableSelectedCount');
    const exportBtn = $id('systemExportSqlBtn');
    const bulkBar = $id('systemTableBulkBar');
    const bulkCount = $id('systemTableBulkCount');
    const bulkSize = $id('systemTableBulkSize');
    const bulkExportSql = $id('systemBulkExportSqlBtn');
    const total = this.state.tables.length;
    const selected = this.state.selectedTables.size;

    if (countEl) {
      countEl.textContent = `${selected} of ${total} table${total === 1 ? '' : 's'} selected`;
    }
    if (exportBtn) {
      exportBtn.disabled = this.state.exportRunning || selected === 0;
    }
    if (bulkExportSql) {
      bulkExportSql.disabled = this.state.exportRunning || selected === 0;
    }
    if (bulkBar) {
      bulkBar.hidden = selected === 0;
    }
    if (bulkCount) {
      bulkCount.textContent = `${selected} table${selected === 1 ? '' : 's'} selected`;
    }
    if (bulkSize) {
      bulkSize.textContent = `Total size: ${formatBytes(this.getSelectedSizeBytes())} (approx.)`;
    }
  }

  renderStats() {
    const tables = this.state.tables;
    const totalSize = this.getTotalSizeBytes();

    const setText = (id, text) => {
      const el = $id(id);
      if (el) el.textContent = text;
    };

    setText('systemTableCount', String(tables.length));
    setText('systemDbOverviewTables', String(tables.length));
    setText('systemDbOverviewSize', formatBytes(totalSize));
    setText('systemDbOverviewAvg', tables.length && totalSize > 0
      ? formatBytes(totalSize / tables.length)
      : '—');
  }

  async loadTables() {
    const gridBody = $id('systemTableGridBody');
    const listBody = $id('systemTableListBody');
    const historyBody = $id('systemExportHistoryBody');
    const activityBody = $id('systemDbRecentActivity');

    const loadingGrid = '<div class="pa-bkp-loading"><span class="pa-spinner"></span> Loading tables…</div>';
    if (gridBody) gridBody.innerHTML = loadingGrid;
    if (listBody) {
      listBody.innerHTML = `<tr><td colspan="7">${loadingGrid}</td></tr>`;
    }
    if (historyBody) {
      historyBody.innerHTML = '<div class="pa-bkp-loading"><span class="pa-spinner"></span> Loading export history…</div>';
    }
    if (activityBody) {
      activityBody.innerHTML = '<div class="pa-bkp-loading"><span class="pa-spinner"></span> Loading…</div>';
    }

    try {
      const payload = await this.fetchJson('/api/admin/database-backup');
      this.state.tables = payload.tables || [];
      this.state.history = payload.history || [];

      if (this.state.focusedTable && !this.state.tables.find((t) => t.name === this.state.focusedTable)) {
        this.state.focusedTable = null;
      }

      for (const name of [...this.state.selectedTables]) {
        if (!this.state.tables.find((t) => t.name === name)) {
          this.state.selectedTables.delete(name);
        }
      }

      this.renderStats();
      this.renderTables();
      this.renderExportHistory();
      this.renderSidebarActivity();
      this.renderSidebar();
      this.setBackupStatus('');
    } catch (err) {
      const errorHtml = `<div class="pa-bkp-empty"><i class="ri-error-warning-line"></i><div class="pa-bkp-empty-title">Could not load tables</div><div class="pa-bkp-empty-text">${escapeHtml(err.message || 'Please try again.')}</div></div>`;
      if (gridBody) gridBody.innerHTML = errorHtml;
      if (listBody) listBody.innerHTML = `<tr><td colspan="7">${errorHtml}</td></tr>`;
    }
  }

  renderTables() {
    this.syncViewMode();
    if (this.state.viewMode === 'grid') {
      this.renderGridView();
    } else {
      this.renderListView();
    }
    this.updateSelectionMeta();
    this.updateMasterCheckbox();
    this.renderSidebar();
  }

  renderGridView() {
    const body = $id('systemTableGridBody');
    if (!body) return;

    const { visible } = this.getPageTables();
    if (!visible.length) {
      body.innerHTML = `<div class="pa-bkp-empty"><div class="pa-bkp-empty-title">${this.state.tables.length ? 'No tables match your filters' : 'No tables found'}</div></div>`;
      return;
    }

    body.innerHTML = visible.map((table) => {
      const meta = getTableMeta(table.name);
      const selected = this.state.selectedTables.has(table.name);
      const focused = this.state.focusedTable === table.name;
      return `<div class="pa-bkp-table-card${selected ? ' is-selected pa-selected' : ''}${focused ? ' is-focused' : ''}" data-table-card data-table-name="${escapeHtml(table.name)}" role="button" tabindex="0">
        ${this.renderTableCheckbox(table.name, selected, 'grid')}
        <div class="pa-bkp-table-card-icon ${meta.tone}"><i class="${meta.icon}"></i></div>
        <div class="pa-bkp-table-card-name">${escapeHtml(table.name)}</div>
        <div class="pa-bkp-table-card-desc">${escapeHtml(meta.desc)}</div>
        <div class="pa-bkp-table-card-foot">
          <div class="pa-bkp-table-card-foot-meta">
            <span><i class="ri-list-check-2"></i> ${Number(table.rowCount || 0).toLocaleString()} rows</span>
            <span><i class="ri-hard-drive-2-line"></i> ${escapeHtml(formatBytes(table.sizeBytes))}</span>
          </div>
          ${this.renderTableCardMenu(table.name)}
        </div>
      </div>`;
    }).join('');
  }

  renderListView() {
    const body = $id('systemTableListBody');
    if (!body) return;

    const { visible, pageItems, totalPages } = this.getPageTables();
    if (this.state.page > totalPages) {
      this.state.page = totalPages;
    }

    if (!visible.length) {
      body.innerHTML = `<tr><td colspan="7"><div class="pa-bkp-empty"><div class="pa-bkp-empty-title">${this.state.tables.length ? 'No tables match your filters' : 'No tables found'}</div></div></td></tr>`;
      this.renderPagination(0, 1);
      return;
    }

    body.innerHTML = pageItems.map((table) => {
      const meta = getTableMeta(table.name);
      const selected = this.state.selectedTables.has(table.name);
      const focused = this.state.focusedTable === table.name;
      return `<tr class="pa-act-row pa-bkp-data-row${selected ? ' selected' : ''}${focused ? ' is-focused' : ''}" data-table-row data-table-name="${escapeHtml(table.name)}">
        <td class="pa-bkp-col-check">
          ${this.renderTableCheckbox(table.name, selected, 'list')}
        </td>
        <td>
          <div class="pa-bkp-data-name">
            <span class="pa-bkp-table-card-icon ${meta.tone}"><i class="${meta.icon}"></i></span>
            <span class="pa-bkp-table-name">${escapeHtml(table.name)}</span>
          </div>
        </td>
        <td class="pa-bkp-data-desc">${escapeHtml(meta.desc)}</td>
        <td class="pa-bkp-col-num">${Number(table.rowCount || 0).toLocaleString()}</td>
        <td class="pa-bkp-col-num">${escapeHtml(formatBytes(table.sizeBytes))}</td>
        <td><span class="pa-act-type-badge"><i class="ri-database-2-line"></i> PostgreSQL</span></td>
        <td class="pa-bkp-col-actions">
          <div class="pa-bkp-row-actions">
            <button type="button" class="pa-bkp-card-action" data-table-action="focus" data-table-name="${escapeHtml(table.name)}" title="View details" aria-label="View ${escapeHtml(table.name)}"><i class="ri-eye-line"></i></button>
            <button type="button" class="pa-bkp-card-action" data-table-action="export" data-table-name="${escapeHtml(table.name)}" title="Export data" aria-label="Export ${escapeHtml(table.name)}"><i class="ri-download-2-line"></i></button>
            <button type="button" class="pa-bkp-card-action" data-table-action="sql" data-table-name="${escapeHtml(table.name)}" title="Copy SQL" aria-label="Copy SQL for ${escapeHtml(table.name)}"><i class="ri-code-line"></i></button>
          </div>
        </td>
      </tr>`;
    }).join('');

    this.renderPagination(visible.length, totalPages);
  }

  renderPagination(totalItems, totalPages) {
    const btnsWrap = $id('systemTablePaginationBtns');
    const info = $id('systemTablePaginationInfo');
    const page = this.state.page;
    const pageSize = this.state.pageSize;

    if (!btnsWrap || !info) return;

    if (totalItems === 0) {
      btnsWrap.innerHTML = '';
      info.textContent = 'Showing 0 of 0';
      return;
    }

    let html = `<div class="pa-page-nav ${page === 1 ? 'disabled' : ''}" id="systemTablePagePrev" role="button" aria-label="Previous page"><i class="ri-arrow-left-s-line"></i></div>`;
    let lastShown = 0;
    for (let p = 1; p <= totalPages; p++) {
      const show = p === 1 || p === totalPages || Math.abs(p - page) <= 1;
      if (!show) continue;
      if (p - lastShown > 1) html += '<span class="pa-bkp-page-ellipsis">…</span>';
      html += `<button type="button" class="pa-page-btn ${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`;
      lastShown = p;
    }
    html += `<div class="pa-page-nav ${page === totalPages ? 'disabled' : ''}" id="systemTablePageNext" role="button" aria-label="Next page"><i class="ri-arrow-right-s-line"></i></div>`;
    btnsWrap.innerHTML = html;

    const startN = (page - 1) * pageSize + 1;
    const endN = Math.min(page * pageSize, totalItems);
    info.textContent = `Showing ${startN} to ${endN} of ${totalItems}`;

    btnsWrap.querySelectorAll('.pa-page-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        this.state.page = parseInt(btn.dataset.page, 10);
        this.renderTables();
      });
    });

    const prev = $id('systemTablePagePrev');
    const next = $id('systemTablePageNext');
    if (prev && page > 1) {
      prev.addEventListener('click', () => {
        this.state.page -= 1;
        this.renderTables();
      });
    }
    if (next && page < totalPages) {
      next.addEventListener('click', () => {
        this.state.page += 1;
        this.renderTables();
      });
    }
  }

  updateMasterCheckbox() {
    const master = $id('systemTableMasterCheck');
    if (!master) return;
    const visible = this.getVisibleTables();
    if (!visible.length) {
      master.checked = false;
      master.indeterminate = false;
      return;
    }
    const selectedVisible = visible.filter((table) => this.state.selectedTables.has(table.name)).length;
    master.checked = selectedVisible === visible.length;
    master.indeterminate = selectedVisible > 0 && selectedVisible < visible.length;
  }

  renderSidebar() {
    const panel = $id('systemDbDetailPanel');
    const chart = $id('systemDbSizeChart');
    const viewBtn = $id('systemDbViewStructureBtn');
    const exportBtn = $id('systemDbExportTableBtn');
    const sqlBtn = $id('systemDbSqlEditorBtn');
    const name = this.state.focusedTable;
    const table = name ? this.state.tables.find((t) => t.name === name) : null;
    const hasTable = !!table;

    if (viewBtn) viewBtn.disabled = !hasTable;
    if (exportBtn) exportBtn.disabled = !hasTable || this.state.exportRunning;
    if (sqlBtn) sqlBtn.disabled = !hasTable;

    if (!panel) return;

    if (!table) {
      panel.innerHTML = `<div class="pa-bkp-detail-empty"><i class="ri-cursor-line"></i><div>Select a table to view details</div></div>`;
      if (chart) {
        chart.innerHTML = `<div class="pa-bkp-detail-empty"><i class="ri-pie-chart-line"></i><div>Select a table to see size share</div></div>`;
      }
      return;
    }

    const meta = getTableMeta(table.name);
    const totalSize = this.getTotalSizeBytes();
    const pct = totalSize > 0 && table.sizeBytes
      ? Math.min(100, (Number(table.sizeBytes) / totalSize) * 100)
      : 0;
    const selected = this.state.selectedTables.has(table.name);

    panel.innerHTML = `<div class="pa-bkp-detail-hero">
      <div class="pa-bkp-detail-icon ${meta.tone}"><i class="${meta.icon}"></i></div>
      <div>
        <div class="pa-bkp-detail-name">${escapeHtml(table.name)}</div>
        ${selected ? '<span class="pa-bkp-status success">Selected</span>' : ''}
        <div class="pa-bkp-detail-desc">${escapeHtml(meta.desc)}</div>
      </div>
    </div>
    <div class="pa-bkp-detail-meta">
      <div class="pa-bkp-detail-meta-item"><div class="pa-bkp-detail-meta-label">Rows</div><div class="pa-bkp-detail-meta-value">${Number(table.rowCount || 0).toLocaleString()}</div></div>
      <div class="pa-bkp-detail-meta-item"><div class="pa-bkp-detail-meta-label">Size</div><div class="pa-bkp-detail-meta-value">${escapeHtml(formatBytes(table.sizeBytes))}</div></div>
      <div class="pa-bkp-detail-meta-item"><div class="pa-bkp-detail-meta-label">Type</div><div class="pa-bkp-detail-meta-value">PostgreSQL</div></div>
      <div class="pa-bkp-detail-meta-item"><div class="pa-bkp-detail-meta-label">Category</div><div class="pa-bkp-detail-meta-value">${escapeHtml(CATEGORY_LABELS[meta.category] || meta.category)}</div></div>
    </div>`;

    if (chart) {
      chart.innerHTML = `<div class="pa-bkp-donut" style="--pct: ${pct.toFixed(1)}">
        <div class="pa-bkp-donut-inner">${pct.toFixed(1)}%</div>
      </div>
      <div class="pa-bkp-size-chart-meta">
        <strong>${escapeHtml(table.name)}</strong> is ${pct.toFixed(1)}% of total database size (${escapeHtml(formatBytes(table.sizeBytes))} of ${escapeHtml(formatBytes(totalSize))}).
      </div>`;
    }
  }

  renderSidebarActivity() {
    const body = $id('systemDbRecentActivity');
    if (!body) return;

    const history = this.state.history.slice(0, 5);
    if (!history.length) {
      body.innerHTML = `<div class="pa-bkp-empty"><div class="pa-bkp-empty-title">No activity yet</div><div class="pa-bkp-empty-text">Exports and backups will appear here.</div></div>`;
      return;
    }

    body.innerHTML = history.map((item) => {
      const { relative } = formatDateTime(item.created_at);
      const meta = item.record_counts?._meta || {};
      const exportKind = meta.exportKind === 'schema' ? 'Schema guide exported' : 'Backup completed';
      const icon = meta.exportKind === 'schema' ? 'ri-file-code-line' : 'ri-check-line';
      const tone = meta.exportKind === 'schema' ? 'warning' : 'success';
      return `<div class="pa-bkp-history-item pa-bkp-activity-item">
        <div class="pa-bkp-history-main">
          <div class="pa-bkp-history-name"><i class="${icon} pa-bkp-status ${tone}"></i> ${escapeHtml(exportKind)}</div>
          <div class="pa-bkp-history-meta"><span>${escapeHtml(item.filename)}</span><span>${escapeHtml(relative)}</span></div>
        </div>
      </div>`;
    }).join('');
  }

  viewTableStructure() {
    const table = this.state.tables.find((t) => t.name === this.state.focusedTable);
    if (!table) return;
    const meta = getTableMeta(table.name);
    requestConfirm({
      title: `Structure: ${table.name}`,
      message: `<div class="pa-bkp-structure-preview">
        <p><strong>Table:</strong> ${escapeHtml(table.name)}</p>
        <p><strong>Description:</strong> ${escapeHtml(meta.desc)}</p>
        <p><strong>Rows:</strong> ${Number(table.rowCount || 0).toLocaleString()}</p>
        <p><strong>Size:</strong> ${escapeHtml(formatBytes(table.sizeBytes))}</p>
        <p><strong>Type:</strong> PostgreSQL (public schema)</p>
        <p class="pa-text-mute fs-sm mt-10">Download the full schema &amp; setup guide for complete DDL, indexes, and RLS policies.</p>
      </div>`,
      confirmLabel: 'Download Schema Guide',
      iconClass: 'ri-database-2-line',
      onConfirm: () => { void this.downloadSchemaGuide(); },
    });
  }

  copySqlQuery(name) {
    if (!name) return;
    const sql = `SELECT * FROM public.${name} LIMIT 100;`;
    navigator.clipboard.writeText(sql).then(() => {
      showStatusToast('SQL query copied to clipboard.', 'success');
    }).catch(() => {
      showToast('Could not copy to clipboard.', 'danger');
    });
  }

  async exportSingleTable(name) {
    if (!name || this.state.exportRunning) return;
    if (!(await this.ensureAdminAccess())) return;
    await this.exportSqlBackup([name]);
  }

  renderExportHistory() {
    const body = $id('systemExportHistoryBody');
    const countEl = $id('systemExportHistoryCount');
    const history = this.state.history;

    if (countEl) {
      countEl.textContent = `${history.length} item${history.length === 1 ? '' : 's'}`;
    }
    if (!body) return;

    if (!history.length) {
      body.innerHTML = `<div class="pa-bkp-empty"><div class="pa-bkp-empty-title">No exports yet</div><div class="pa-bkp-empty-text">SQL downloads will appear here as metadata-only audit entries.</div></div>`;
      return;
    }

    body.innerHTML = history.map((item) => {
      const { date, time } = formatDateTime(item.created_at);
      const meta = item.record_counts?._meta || {};
      const exportKind = meta.exportKind === 'schema' ? 'Schema guide' : 'SQL data';
      const tableEntries = item.record_counts && typeof item.record_counts === 'object'
        ? Object.entries(item.record_counts).filter(([key]) => key !== '_meta')
        : [];
      const tableSummary = exportKind === 'SQL data' && tableEntries.length
        ? `${tableEntries.length} tables · ${tableEntries.reduce((sum, [, count]) => sum + Number(count || 0), 0).toLocaleString()} rows`
        : exportKind;

      return `<div class="pa-bkp-history-item">
        <div class="pa-bkp-history-main">
          <div class="pa-bkp-history-name">${escapeHtml(item.filename)}</div>
          <div class="pa-bkp-history-meta">
            <span><i class="ri-file-code-line"></i> ${escapeHtml(exportKind)}</span>
            <span><i class="ri-hard-drive-2-line"></i> ${escapeHtml(formatBytes(item.size_bytes))}</span>
            <span><i class="ri-calendar-line"></i> ${escapeHtml(date)} · ${escapeHtml(time)}</span>
          </div>
          <div class="pa-bkp-history-sub">${escapeHtml(tableSummary)}</div>
        </div>
        <button type="button" class="pa-bkp-card-action pa-bkp-card-action--danger" data-export-action="delete" data-export-id="${escapeHtml(item.id)}" title="Remove export log" aria-label="Remove ${escapeHtml(item.filename)}"><i class="ri-delete-bin-line"></i></button>
      </div>`;
    }).join('');

    this.renderSidebarActivity();
  }

  confirmDeleteExport(id) {
    const item = this.state.history.find((entry) => entry.id === id);
    if (!item) return;

    requestConfirm({
      title: 'Remove export log?',
      message: `This removes the audit entry for <strong>${escapeHtml(item.filename)}</strong>. Downloaded SQL files on your computer are not affected.`,
      confirmLabel: 'Remove Entry',
      iconClass: 'ri-delete-bin-line',
      danger: true,
      onConfirm: () => this.deleteExportRecord(id),
    });
  }

  async deleteExportRecord(id) {
    if (!(await this.ensureAdminAccess())) return;

    try {
      await this.fetchJson(`/api/admin/database-backup?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      showStatusToast('Export log removed.', 'success');
      await this.loadTables();
    } catch (err) {
      showToast(err.message || 'Could not remove export log.', 'danger');
    }
  }

  setBackupStatus(message, tone = 'info') {
    const box = $id('systemBackupStatus');
    if (!box) return;
    if (!message) {
      box.hidden = true;
      box.textContent = '';
      return;
    }
    box.hidden = false;
    box.className = `pa-info-box mb-16 ${tone === 'danger' ? 'pa-info-box-danger' : ''}`.trim();
    box.innerHTML = `<i class="ri-information-line"></i> ${escapeHtml(message)}`;
  }

  setExportRunning(running) {
    this.state.exportRunning = running;
    const sqlBtn = $id('systemExportSqlBtn');
    const schemaBtn = $id('systemExportSchemaBtn');
    const bulkSql = $id('systemBulkExportSqlBtn');
    const exportTableBtn = $id('systemDbExportTableBtn');
    const selected = this.state.selectedTables.size;
    if (sqlBtn) sqlBtn.disabled = running || selected === 0;
    if (schemaBtn) schemaBtn.disabled = running;
    if (bulkSql) bulkSql.disabled = running || selected === 0;
    if (exportTableBtn) exportTableBtn.disabled = running || !this.state.focusedTable;
  }

  async downloadFileResponse(res, fallbackName) {
    if (res.status === 401) {
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || res.statusText || 'Download failed');
    }
    const blob = await res.blob();
    const filename = parseDownloadFilename(res.headers.get('Content-Disposition'), fallbackName);
    triggerBlobDownload(blob, filename);
    return filename;
  }

  async exportSqlBackup(overrideTables?: Iterable<string>) {
    if (this.state.exportRunning) return;
    if (!(await this.ensureAdminAccess())) return;

    const tables = overrideTables ? [...overrideTables] : [...this.state.selectedTables];
    if (!tables.length) {
      showToast('Select at least one table to export.', 'danger');
      return;
    }

    this.setExportRunning(true);
    this.setBackupStatus(`Exporting ${tables.length} table${tables.length === 1 ? '' : 's'} to SQL…`);

    try {
      const res = await fetch('/api/admin/database-backup', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          Accept: 'application/sql',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tables, format: 'sql' }),
      });

      const filename = await this.downloadFileResponse(res, 'backup-data.sql');
      this.setBackupStatus(`SQL backup downloaded: ${filename}`);
      showStatusToast('SQL backup downloaded successfully.', 'success');
      await this.loadTables();
    } catch (err) {
      this.setBackupStatus(err.message || 'Export failed.', 'danger');
      showToast(err.message || 'Export failed.', 'danger');
    } finally {
      this.setExportRunning(false);
    }
  }

  async downloadSchemaGuide() {
    if (this.state.exportRunning) return;
    if (!(await this.ensureAdminAccess())) return;

    this.setExportRunning(true);
    this.setBackupStatus('Preparing schema and setup guide…');

    try {
      const res = await fetch('/api/admin/database-backup?schema=1', {
        credentials: 'same-origin',
        headers: { Accept: 'application/sql' },
      });

      const filename = await this.downloadFileResponse(res, 'schema-setup.sql');
      this.setBackupStatus(`Schema guide downloaded: ${filename}`);
      showStatusToast('Schema & setup guide downloaded.', 'success');
      await this.loadTables();
    } catch (err) {
      this.setBackupStatus(err.message || 'Schema export failed.', 'danger');
      showToast(err.message || 'Schema export failed.', 'danger');
    } finally {
      this.setExportRunning(false);
    }
  }

  hydrateEnvironmentForm(values = {}) {
    for (const [key, fieldId] of Object.entries(ENV_FIELD_MAP)) {
      const el = $id(fieldId);
      if (!el) continue;
      const value = values[key] ?? '';
      if (SECRET_FIELDS.has(key)) {
        el.value = '';
        el.placeholder = value ? `Configured (${value})` : 'Leave blank to keep current value';
      } else {
        el.value = value;
      }
    }
  }

  collectEnvironmentUpdates() {
    const updates = {};
    for (const [key, fieldId] of Object.entries(ENV_FIELD_MAP)) {
      const el = $id(fieldId);
      if (!el) continue;
      const value = el.value.trim();
      if (SECRET_FIELDS.has(key)) {
        updates[key] = value ? value : UNCHANGED_SECRET;
      } else {
        updates[key] = value;
      }
    }
    return updates;
  }

  renderEnvironmentMeta(config) {
    const meta = $id('systemEnvMeta');
    if (!meta || !config) return;
    const source = config.source ? `Loaded from ${config.source}` : 'Environment settings loaded';
    const target = config.targetFile ? ` · writes to ${config.targetFile}` : '';
    const writable = config.writable === false
      ? ' · file writes may be unavailable in this deployment'
      : '';
    meta.innerHTML = `<i class="ri-information-line"></i> ${escapeHtml(source)}${escapeHtml(target)}${escapeHtml(writable)}`;
  }

  async loadEnvironment() {
    try {
      const config = await this.fetchJson('/api/admin/environment');
      this.state.env = config;
      this.hydrateEnvironmentForm(config.values || {});
      this.renderEnvironmentMeta(config);
    } catch (err) {
      showToast(err.message || 'Could not load environment configuration.', 'danger');
    }
  }

  async saveEnvironment() {
    if (!(await this.ensureAdminAccess())) return;

    const values = this.collectEnvironmentUpdates();
    const saveBtn = $id('systemEnvSaveBtn');
    if (saveBtn) saveBtn.disabled = true;

    try {
      const payload = await this.fetchJson('/api/admin/environment', {
        method: 'PUT',
        body: JSON.stringify({ values }),
      });
      this.state.env = payload;
      this.hydrateEnvironmentForm(payload.values || {});
      this.renderEnvironmentMeta(payload);
      showStatusToast(payload.message || 'Environment saved to .env.local.', 'success');
    } catch (err) {
      showToast(err.message || 'Could not save environment configuration.', 'danger');
    } finally {
      if (saveBtn) saveBtn.disabled = false;
    }
  }
}
