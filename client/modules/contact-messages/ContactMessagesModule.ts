import { Module } from '../../core/Module.js';
import { storage } from '../../core/StorageService.js';
import { $id, $all, escapeHtml } from '../../utils/dom.js';
import { csvEscapeField } from '../../utils/format.js';
import { debounce } from '../../utils/timing.js';
import { requestDelete } from '../../modules/shell/confirm.js';
import { closeAllCardMenus } from '../../modules/shell/cardMenu.js';
import { BulkSelectController } from '../../core/BulkSelectController.js';
import { closePanels, openPanel, registerPanel } from '../../modules/shell/panels.js';
import * as mediaPicker from '../../utils/MediaPicker.js';

const MSG_AVATAR_COLORS = ['#e5484d', '#f0c040', '#22c55e', '#38bdf8', '#a78bfa', '#f472b6', '#ff6600', '#2dd4bf'];
const PAGE_SIZE = 8;

function msgInitials(name) { return (name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase(); }
function msgAvatarColor(name) {
  let hash = 0;
  const str = name || '';
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return MSG_AVATAR_COLORS[hash % MSG_AVATAR_COLORS.length];
}
function statusLabel(status) {
  return { new: 'New', read: 'Read', replied: 'Replied', spam: 'Spam' }[status] || status;
}
function formatMsgDateTime(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return { date: 'Unknown', time: '' };
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
    };
  } catch { return { date: 'Unknown', time: '' }; }
}

export class ContactMessagesModule extends Module {
  constructor() {
    super({
      name: 'ContactMessages',
      storageKey: 'pa_contact_messages',
      initialState: {
        messages: [], selectedId: null, statusFilter: 'all', timeFilter: 'all', searchQuery: '', page: 1,
        replyMode: null, editingReplyId: null,
      },
    });
    this.msgNow = Date.now();
    this._replyAttachment = null;
    this.bulkSelect = new BulkSelectController(this, {
      containerId: 'paMsgTableBody',
      itemSelector: '.pa-msg-row',
      idAttr: 'data-msg-id',
      label: 'message',
      skipRowClick: true,
      getVisibleIds: () => this.getFiltered().map((m) => m.id),
      onBulkDelete: (ids) => this.bulkDelete(ids),
    });
  }

  async bulkDelete(ids) {
    const n = ids.size;
    if (n === 0) return;
    const prev = this.store.get('messages');
    const filtered = prev.filter((m) => !ids.has(String(m.id)));
    this.store.set('messages', filtered);
    if (ids.has(String(this.store.get('selectedId')))) this.store.set('selectedId', null);
    try {
      await this.persist();
      this.renderTable();
      this.renderDetail();
      this.statusToast(`${n} message${n > 1 ? 's' : ''} deleted.`, 'danger');
      this.notify(`${n} message${n > 1 ? 's' : ''} deleted in bulk.`, 'ri-delete-bin-line');
    } catch {
      this.store.set('messages', prev);
      this.renderTable();
      this.renderDetail();
      this.statusToast('Could not delete messages. Please try again.', 'danger');
    }
  }

  async load() {
    const bootstrap = await this.loadRecords(() => ({ items: [], nextCursor: null, total: 0 }));
    let messages = Array.isArray(bootstrap) ? bootstrap : (bootstrap?.items || []);
    let cursor = Array.isArray(bootstrap) ? null : bootstrap?.nextCursor;

    while (cursor) {
      try {
        const res = await fetch(
          `/api/contact-messages?cursor=${encodeURIComponent(cursor)}&limit=50`,
          { method: 'GET', headers: { Accept: 'application/json' }, credentials: 'same-origin' },
        );
        if (!res.ok) break;
        const page = await res.json();
        messages = messages.concat(page.items || []);
        cursor = page.nextCursor;
      } catch {
        break;
      }
    }

    this.store.set('messages', messages);
    storage._persist(this.storageKey, messages).catch(() => {});
    this.computeNow();
  }

  patchMessage(updated) {
    if (!updated) return;
    const messages = this.store.get('messages').map((row) => (
      this.sameId(row.id, updated.id) || this.sameId(row.dbId, updated.dbId)
        ? { ...row, ...updated, id: updated.id ?? row.id }
        : row
    ));
    this.store.set('messages', messages);
    storage._persist(this.storageKey, messages).catch(() => {});
  }

  async persist() { await this.saveRecords(this.store.get('messages')); }

  computeNow() {
    const messages = this.store.get('messages');
    if (!messages.length) { this.msgNow = Date.now(); return; }
    const latest = Math.max(...messages.map((m) => new Date(m.createdAt).getTime()));
    this.msgNow = latest + 60 * 60 * 1000;
  }

  sameId(a, b) { return a != null && b != null && String(a) === String(b); }

  findById(id) { return this.store.get('messages').find((m) => this.sameId(m.id, id)); }

  parseMsgId(raw) {
    if (raw == null || raw === '') return null;
    const value = String(raw);
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return value;
    const asInt = Number.parseInt(value, 10);
    return Number.isFinite(asInt) && String(asInt) === value ? asInt : value;
  }

  getFiltered() {
    const { messages, statusFilter, timeFilter, searchQuery } = this.store._raw;
    let result = messages.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (statusFilter !== 'all') {
      result = statusFilter === 'unread' ? result.filter((m) => m.status === 'new') : result.filter((m) => m.status === statusFilter);
    }
    if (timeFilter !== 'all') {
      const spans = { today: 864e5, week: 864e5 * 7, month: 864e5 * 30 };
      const span = spans[timeFilter];
      if (span) result = result.filter((m) => this.msgNow - new Date(m.createdAt).getTime() <= span);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.subject.toLowerCase().includes(q));
    }
    return result;
  }

  render() {
    this.renderTable();
    this.renderDetail();
  }

  renderRow(m) {
    const initials = msgInitials(m.name);
    const color = msgAvatarColor(m.name);
    const { date, time } = formatMsgDateTime(m.createdAt);
    const isSelected = this.sameId(m.id, this.store.get('selectedId'));
    const isUnread = m.status === 'new';
    const bulkMode = this.bulkSelect.isSelectMode();
    const bulkSelected = this.bulkSelect.isSelected(m.id);

    let cells = '';

    if (bulkMode) {
      cells += `<td style="width:36px;"><input type="checkbox" class="pa-msg-bulk-checkbox" data-select-id="${m.id}" ${bulkSelected ? 'checked' : ''} aria-label="Select message from ${escapeHtml(m.name)} for bulk actions" /></td>`;
    } else {
      cells += `<td style="width:36px;"><input type="checkbox" class="pa-msg-checkbox" data-msg-id="${m.id}" ${isSelected ? 'checked' : ''} aria-label="Select message from ${escapeHtml(m.name)}" /></td>`;
    }

    cells += `<td><div class="pa-msg-from"><div class="pa-msg-avatar" style="background:${color};">${escapeHtml(initials)}</div><div style="min-width:0;"><div class="pa-msg-name" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(m.name)}</div><div class="pa-msg-email" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(m.email)}</div></div></div></td>`;
    cells += `<td class="pa-msg-subject-col"><div class="pa-msg-subject">${escapeHtml(m.subject)}</div><div class="pa-msg-snippet">${escapeHtml(m.snippet)}</div></td>`;
    cells += `<td><span class="pa-status-badge ${m.status}">${statusLabel(m.status)}</span></td>`;
    cells += `<td><div class="pa-msg-date">${date}</div><div class="pa-msg-time">${time}</div></td>`;
    cells += `<td><div class="pa-msg-actions pa-card-actions"><button class="pa-action-btn pa-action-more" data-action="menu" data-msg-id="${m.id}" title="More options" aria-label="More options"><i class="ri-more-2-fill"></i></button><div class="pa-card-menu" data-msg-id="${m.id}"><div class="pa-card-menu-item" data-action="${m.status === 'new' ? 'mark-read' : 'mark-unread'}" data-msg-id="${m.id}"><i class="ri-mail-open-line"></i> ${m.status === 'new' ? 'Mark as Read' : 'Mark as Unread'}</div><div class="pa-card-menu-item" data-action="toggle-spam" data-msg-id="${m.id}"><i class="ri-spam-2-line"></i> ${m.status === 'spam' ? 'Not Spam' : 'Mark as Spam'}</div><div class="pa-card-menu-item danger" data-action="delete" data-msg-id="${m.id}"><i class="ri-delete-bin-line"></i> Delete</div></div></div></td>`;

    return `<tr class="pa-msg-row ${isSelected ? 'selected' : ''} ${isUnread ? 'unread' : ''}${bulkSelected ? ' pa-selected' : ''}" data-msg-id="${m.id}">${cells}</tr>`;
  }

  renderMailPreview() {
    const list = $id('paMailPreviewList');
    const badge = $id('paMailPreviewBadge');
    if (!list) return;
    const allUnread = this.store.get('messages').filter((m) => m.status === 'new').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const unread = allUnread.slice(0, 5);
    if (badge) { badge.textContent = allUnread.length; badge.classList.toggle('hidden', allUnread.length === 0); }
    if (unread.length === 0) { list.innerHTML = `<div class="pa-notif-empty">No new messages</div>`; return; }
    list.innerHTML = unread.map((m) => `<div class="pa-notif-item" data-msg-id="${m.id}"><div class="pa-notif-item-icon"><i class="ri-mail-line"></i></div><div><div class="pa-notif-item-text"><strong>${escapeHtml(m.name)}</strong> — ${escapeHtml(m.subject)}</div><div class="pa-notif-item-time">${formatMsgDateTime(m.createdAt).date}</div></div></div>`).join('');
    list.querySelectorAll('.pa-notif-item').forEach((item) => {
      item.addEventListener('click', () => {
        this.selectMessage(this.parseMsgId(item.dataset.msgId));
        $id('paMailPreviewWrap')?.classList.remove('open');
        $id('paMsgListCard')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  renderTable() {
    const all = this.getFiltered();
    const totalItems = all.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    let page = this.store.get('page');
    if (page > totalPages) page = totalPages;
    if (page < 1) page = 1;
    this.store.set('page', page);

    const start = (page - 1) * PAGE_SIZE;
    const pageItems = all.slice(start, start + PAGE_SIZE);
    const tbody = $id('paMsgTableBody');
    if (tbody) {
      if (pageItems.length === 0) {
        const hasFilters = this.store.get('searchQuery').trim() || this.store.get('statusFilter') !== 'all' || this.store.get('timeFilter') !== 'all';
        tbody.innerHTML = `<tr class="pa-msg-table-empty"><td colspan="6"><div class="pa-empty-state"><i class="ri-mail-line"></i><div class="pa-empty-state-title">${hasFilters ? 'No messages match your filters' : 'No messages yet'}</div><div class="pa-empty-state-text">${hasFilters ? 'Try adjusting your search, status, or date filters.' : 'Messages submitted through your contact form will appear here.'}</div>${hasFilters ? `<button class="pa-empty-state-btn" id="paMsgEmptyResetBtn">Reset filters</button>` : ''}</div></td></tr>`;
        this.on($id('paMsgEmptyResetBtn'), 'click', () => this.resetFilters());
      } else {
        tbody.innerHTML = pageItems.map((m) => this.renderRow(m)).join('');
      }
    }
    this.renderPagination(totalItems, totalPages, page);
    this.attachRowListeners();
    this.bulkSelect.onRender();
    this.renderMailPreview();
  }

  renderPagination(totalItems, totalPages, page) {
    const btnsWrap = $id('paMsgPaginationBtns');
    const info = $id('paMsgPaginationInfo');
    if (!btnsWrap || !info) return;
    if (totalItems === 0) { btnsWrap.innerHTML = ''; info.textContent = 'Showing 0 messages'; return; }
    if (totalPages <= 1) { btnsWrap.innerHTML = ''; info.textContent = `Showing ${totalItems} of ${totalItems} messages`; return; }

    let html = `<div class="pa-page-nav ${page === 1 ? 'disabled' : ''}" id="paMsgPagePrev" role="button" aria-label="Previous page"><i class="ri-arrow-left-s-line"></i></div>`;
    let lastShown = 0;
    for (let p = 1; p <= totalPages; p++) {
      const show = p === 1 || p === totalPages || Math.abs(p - page) <= 1;
      if (!show) continue;
      if (p - lastShown > 1) html += `<span style="color:var(--pa-text-faint);padding:0 4px;font-size:12px;">…</span>`;
      html += `<button class="pa-page-btn ${p === page ? 'active' : ''}" data-page="${p}">${p}</button>`;
      lastShown = p;
    }
    html += `<div class="pa-page-nav ${page === totalPages ? 'disabled' : ''}" id="paMsgPageNext" role="button" aria-label="Next page"><i class="ri-arrow-right-s-line"></i></div>`;
    btnsWrap.innerHTML = html;

    const startN = (page - 1) * PAGE_SIZE + 1;
    const endN = Math.min(page * PAGE_SIZE, totalItems);
    info.textContent = `Showing ${startN} to ${endN} of ${totalItems} messages`;

    btnsWrap.querySelectorAll('.pa-page-btn').forEach((btn) => {
      btn.addEventListener('click', () => { this.store.set('page', parseInt(btn.dataset.page, 10)); this.renderTable(); $id('paMsgListCard')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); });
    });
    const prev = $id('paMsgPagePrev');
    const next = $id('paMsgPageNext');
    if (prev && !prev.classList.contains('disabled')) prev.addEventListener('click', () => { this.store.set('page', page - 1); this.renderTable(); });
    if (next && !next.classList.contains('disabled')) next.addEventListener('click', () => { this.store.set('page', page + 1); this.renderTable(); });
  }

  attachRowListeners() {
    const tbody = $id('paMsgTableBody');
    if (!tbody) return;
    tbody.querySelectorAll('.pa-msg-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (this.bulkSelect.isSelectMode()) {
          if (e.target.closest('.pa-msg-actions') || e.target.closest('[data-select-id]')) return;
          this.bulkSelect.toggleSelect(row.dataset.msgId);
          return;
        }
        if (e.target.closest('.pa-msg-actions') || e.target.classList.contains('pa-msg-checkbox')) return;
        this.selectMessage(this.parseMsgId(row.dataset.msgId));
      });
    });
    tbody.querySelectorAll('.pa-msg-checkbox').forEach((cb) => {
      cb.addEventListener('click', (e) => { e.stopPropagation(); this.selectMessage(this.parseMsgId(cb.dataset.msgId)); });
    });
    tbody.querySelectorAll('[data-action="menu"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.msgId;
        const menu = tbody.querySelector(`.pa-card-menu[data-msg-id="${CSS.escape(id)}"]`);
        document.querySelectorAll('.pa-card-menu.open').forEach((m) => { if (m !== menu) m.classList.remove('open'); });
        menu?.classList.toggle('open');
      });
    });
    tbody.querySelectorAll('.pa-card-menu-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        const id = this.parseMsgId(item.dataset.msgId);
        closeAllCardMenus();
        const m = this.findById(id);
        if (!m) return;
        if (action === 'mark-read') { m.status = 'read'; this.persist(); this.renderTable(); if (this.sameId(this.store.get('selectedId'), id)) this.renderDetail(); this.toast(`Marked "${m.name}"'s message as read.`, 'info', 2000); }
        else if (action === 'mark-unread') { m.status = 'new'; this.persist(); this.renderTable(); if (this.sameId(this.store.get('selectedId'), id)) this.renderDetail(); this.toast(`Marked "${m.name}"'s message as unread.`, 'info', 2000); }
        else if (action === 'toggle-spam') {
          m.status = m.status === 'spam' ? 'read' : 'spam';
          this.persist(); this.renderTable();
          if (this.sameId(this.store.get('selectedId'), id)) this.renderDetail();
          this.toast(m.status === 'spam' ? `Marked "${m.name}"'s message as spam.` : `Removed "${m.name}"'s message from spam.`, m.status === 'spam' ? 'danger' : 'success', 2200);
        } else if (action === 'delete') {
          requestDelete(id, 'message', m.name, 'Delete this message?');
        }
      });
    });
  }

  resetFilters() {
    this.store.batch(() => {
      this.store.set('searchQuery', '');
      this.store.set('statusFilter', 'all');
      this.store.set('timeFilter', 'all');
      this.store.set('page', 1);
    });
    const searchInput = $id('paSearchInput');
    if (searchInput) { searchInput.value = ''; $id('paSearchWrap')?.classList.remove('has-value'); }
    const toolbarSearch = $id('paMsgSearchInput');
    if (toolbarSearch) toolbarSearch.value = '';
    const statusSelect = $id('paMsgStatusFilter');
    if (statusSelect) statusSelect.value = 'all';
    const timeSelect = $id('paMsgTimeFilter');
    if (timeSelect) timeSelect.value = 'all';
    $all('.pa-status-tab').forEach((t) => t.classList.toggle('active', t.dataset.status === 'all'));
    this.renderTable();
  }

  selectMessage(id) {
    const m = this.findById(id);
    if (!m) return;
    this.store.set('selectedId', id);
    if (m.status === 'new') {
      m.status = 'read';
      this.persist().catch(() => {});
    }
    this.renderTable();
    this.renderDetail();
  }

  getMessageReplies(m) {
    if (Array.isArray(m?.replies) && m.replies.length) return m.replies;
    if (m?.reply) {
      return [{
        id: `legacy-${m.id}`,
        body: m.reply,
        subject: m.subject || '',
        cc: '',
        attachmentUrl: '',
        attachmentName: '',
        sentAt: m.repliedAt,
      }];
    }
    return [];
  }

  clearReplyAttachment() {
    this._replyAttachment = null;
    const preview = $id('paMsgReplyAttachPreview');
    const fileInput = $id('paMsgReplyFile');
    if (fileInput) fileInput.value = '';
    if (preview) {
      preview.hidden = true;
      preview.innerHTML = '';
    }
  }

  renderReplyAttachmentPreview(label) {
    const preview = $id('paMsgReplyAttachPreview');
    if (!preview) return;
    preview.hidden = false;
    preview.innerHTML = `
      <span><i class="ri-attachment-2"></i> ${escapeHtml(label)}</span>
      <button type="button" class="pa-btn-sm" id="paMsgReplyAttachClear">Remove</button>`;
    $id('paMsgReplyAttachClear')?.addEventListener('click', () => this.clearReplyAttachment());
  }

  setReplyAttachment(file, contentBase64) {
    this._replyAttachment = {
      name: file.name,
      mime: file.type || 'application/octet-stream',
      size: file.size,
      contentBase64,
    };
    this.renderReplyAttachmentPreview(file.name);
  }

  setReplyAttachmentFromMedia(item) {
    const mime = item.type || 'application/octet-stream';
    let contentBase64 = null;
    if (item.url?.startsWith('data:')) {
      const comma = item.url.indexOf(',');
      contentBase64 = comma >= 0 ? item.url.slice(comma + 1) : null;
    }
    this._replyAttachment = {
      fromMedia: true,
      url: item.url,
      name: item.name || 'attachment',
      mime,
      size: item.size || 0,
      contentBase64,
    };
    this.renderReplyAttachmentPreview(`${item.name} (from Media Library)`);
  }

  buildReplyAttachmentPayload() {
    if (!this._replyAttachment || this._replyAttachment.clear) return undefined;
    if (this._replyAttachment.fromMedia) {
      return {
        fromMedia: true,
        url: this._replyAttachment.url,
        name: this._replyAttachment.name,
        mime: this._replyAttachment.mime,
        size: this._replyAttachment.size,
      };
    }
    return {
      name: this._replyAttachment.name,
      mime: this._replyAttachment.mime,
      size: this._replyAttachment.size,
      contentBase64: this._replyAttachment.contentBase64,
    };
  }

  async refreshLinkedMediaCache() {
    storage.invalidate('pa_media_library');
    await storage.get('pa_media_library', []).catch(() => []);
  }

  async readFileAsBase64(file) {
    const buffer = await file.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  }

  openReplyModal(messageId, replyId = null) {
    const m = this.findById(messageId);
    if (!m) return;
    const editing = replyId
      ? this.getMessageReplies(m).find((r) => String(r.id) === String(replyId))
      : null;

    this.store.set('replyMode', editing ? 'edit' : 'create');
    this.store.set('editingReplyId', editing ? editing.id : null);
    this.store.set('selectedId', m.id);
    this.clearReplyAttachment();

    const toInput = $id('paMsgReplyTo');
    const ccInput = $id('paMsgReplyCc');
    const subjectInput = $id('paMsgReplySubject');
    const textInput = $id('paMsgReplyText');
    const title = $id('paMsgReplyPanelTitle');
    const sendLabel = $id('paMsgReplySendLabel');
    const resendWrap = $id('paMsgReplyResendWrap');
    const resend = $id('paMsgReplyResend');

    if (toInput) toInput.value = m.email || '';
    if (ccInput) ccInput.value = editing?.cc || '';
    if (subjectInput) {
      const base = editing?.subject || m.subject || '';
      subjectInput.value = base.toLowerCase().startsWith('re:') ? base : `Re: ${base}`;
    }
    if (textInput) textInput.value = editing?.body || '';
    if (title) title.textContent = editing ? 'Edit Reply' : 'Reply to Message';
    if (sendLabel) sendLabel.textContent = editing ? 'Save Reply' : 'Send Reply';
    if (resendWrap) resendWrap.hidden = !editing;
    if (resend) resend.checked = false;

    if (editing?.attachmentName) {
      const preview = $id('paMsgReplyAttachPreview');
      if (preview) {
        preview.hidden = false;
        preview.innerHTML = `
          <span><i class="ri-attachment-2"></i> ${escapeHtml(editing.attachmentName)} (kept)</span>
          <button type="button" class="pa-btn-sm" id="paMsgReplyAttachClear">Remove</button>`;
        $id('paMsgReplyAttachClear')?.addEventListener('click', () => {
          this._replyAttachment = { clear: true };
          preview.hidden = true;
          preview.innerHTML = '';
        });
      }
    }

    openPanel('paMsgReplyPanel');
    setTimeout(() => textInput?.focus(), 50);
  }

  closeReplyModal() {
    closePanels();
    this.store.set('replyMode', null);
    this.store.set('editingReplyId', null);
    this.clearReplyAttachment();
    const sendBtn = $id('paMsgReplySend');
    if (sendBtn) {
      sendBtn.disabled = false;
      sendBtn.classList.remove('loading');
    }
  }

  async submitReplyModal() {
    const m = this.findById(this.store.get('selectedId'));
    if (!m) return;

    const text = ($id('paMsgReplyText')?.value || '').trim();
    const subject = ($id('paMsgReplySubject')?.value || '').trim();
    const cc = ($id('paMsgReplyCc')?.value || '').trim();
    if (!text) {
      this.toast('Please write a reply before sending.', 'danger');
      $id('paMsgReplyText')?.focus();
      return;
    }

    const mode = this.store.get('replyMode');
    const editingReplyId = this.store.get('editingReplyId');
    const sendBtn = $id('paMsgReplySend');
    const sendLabel = $id('paMsgReplySendLabel');
    if (sendBtn) {
      sendBtn.disabled = true;
      sendBtn.classList.add('loading');
    }
    if (sendLabel) sendLabel.textContent = mode === 'edit' ? 'Saving…' : 'Sending…';

    try {
      const attachmentPayload = this.buildReplyAttachmentPayload();

      let res;
      if (mode === 'edit' && editingReplyId) {
        res = await fetch('/api/contact-messages/reply', {
          method: 'PUT',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            replyId: editingReplyId,
            reply: text,
            subject,
            cc,
            resend: !!$id('paMsgReplyResend')?.checked,
            clearAttachment: !!this._replyAttachment?.clear,
            attachment: attachmentPayload,
          }),
        });
      } else {
        res = await fetch('/api/contact-messages/reply', {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            id: m.id,
            reply: text,
            subject,
            cc,
            attachment: attachmentPayload,
          }),
        });
      }

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Could not save reply.');

      if (payload.message) this.patchMessage(payload.message);
      await this.refreshLinkedMediaCache();
      this.closeReplyModal();
      this.renderTable();
      this.renderDetail();
      this.toast(mode === 'edit' ? 'Reply updated.' : `Reply sent to ${m.name}.`, 'success');
      this.notify(mode === 'edit' ? `Updated reply to ${m.name}.` : `You replied to ${m.name}'s message.`, 'ri-reply-line');
    } catch (err) {
      this.toast(err?.message || 'Could not send reply. Please try again.', 'danger');
      if (sendBtn) {
        sendBtn.disabled = false;
        sendBtn.classList.remove('loading');
      }
      if (sendLabel) sendLabel.textContent = mode === 'edit' ? 'Save Reply' : 'Send Reply';
    }
  }

  async deleteReply(replyId) {
    const m = this.findById(this.store.get('selectedId'));
    if (!m || !replyId || String(replyId).startsWith('legacy-')) {
      this.toast('This reply cannot be deleted.', 'danger');
      return;
    }
    try {
      const res = await fetch('/api/contact-messages/reply', {
        method: 'DELETE',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ replyId }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error || 'Could not delete reply.');
      if (payload.message) this.patchMessage(payload.message);
      await this.refreshLinkedMediaCache();
      this.renderTable();
      this.renderDetail();
      this.toast('Reply deleted.', 'danger');
    } catch (err) {
      this.toast(err?.message || 'Could not delete reply.', 'danger');
    }
  }

  renderDetail() {
    const body = $id('paMsgDetailBody');
    const footer = $id('paMsgDetailFooter');
    const detailPanel = $id('paMsgDetailPanel');
    if (!body) return;
    const m = this.findById(this.store.get('selectedId'));

    if (!m) {
      detailPanel?.classList.remove('has-selection');
      body.innerHTML = `<div class="pa-msg-detail-empty"><i class="ri-mail-open-line"></i><div class="pa-msg-detail-empty-title">No message selected</div><div class="pa-msg-detail-empty-text">Select a message from the list to view its full content here.</div></div>`;
      if (footer) footer.innerHTML = '';
      const starBtn = $id('paMsgDetailStar');
      if (starBtn) starBtn.innerHTML = '<i class="ri-star-line"></i>';
      return;
    }

    detailPanel?.classList.add('has-selection');

    const initials = msgInitials(m.name);
    const color = msgAvatarColor(m.name);
    const received = formatMsgDateTime(m.createdAt);
    const replies = this.getMessageReplies(m);

    let html = `
      <div class="pa-msg-detail-sender">
        <div class="pa-msg-detail-avatar" style="background:${color};">${escapeHtml(initials)}</div>
        <div style="min-width:0;">
          <div class="pa-msg-detail-sender-name">${escapeHtml(m.name)}</div>
          <div class="pa-msg-detail-sender-email">${escapeHtml(m.email)} <i class="ri-file-copy-line pa-msg-detail-copy" id="paMsgCopyEmail" title="Copy email"></i></div>
        </div>
        <div class="pa-msg-detail-sender-status"><span class="pa-status-badge ${m.status}">${statusLabel(m.status)}</span></div>
      </div>
      <div class="pa-msg-detail-meta">
        <span><i class="ri-calendar-line"></i> ${received.date} at ${received.time}</span>
        <span><i class="ri-map-pin-line"></i> IP: ${escapeHtml(m.ip || '—')}</span>
      </div>
      <div class="pa-msg-detail-label">Subject</div>
      <div class="pa-msg-detail-subject">${escapeHtml(m.subject)}</div>
      <div class="pa-msg-detail-label">Message</div>
      <div class="pa-msg-detail-box">${escapeHtml(m.message)}</div>
    `;

    if (replies.length) {
      html += `
        <div class="pa-msg-detail-reply-section">
          <div class="pa-msg-detail-label">Your Replies (${replies.length})</div>
          <div class="pa-msg-reply-thread">
            ${replies.map((r, index) => {
              const when = formatMsgDateTime(r.sentAt || r.createdAt);
              const canEdit = r.id && !String(r.id).startsWith('legacy-');
              const isOpen = index === 0;
              return `
                <div class="pa-msg-reply-card${isOpen ? ' is-open' : ''}" data-reply-id="${escapeHtml(String(r.id))}">
                  <div class="pa-msg-reply-card-head">
                    <button type="button" class="pa-msg-reply-card-toggle" aria-expanded="${isOpen ? 'true' : 'false'}" aria-controls="paMsgReplyContent-${escapeHtml(String(r.id))}">
                      <div class="pa-msg-reply-card-head-text">
                        <div class="pa-msg-reply-card-title">${escapeHtml(r.subject || `Re: ${m.subject}`)}</div>
                        <div class="pa-msg-reply-card-meta">Sent ${when.date}${when.time ? ` at ${when.time}` : ''}${r.cc ? ` · Cc ${escapeHtml(r.cc)}` : ''}</div>
                      </div>
                    </button>
                    <div class="pa-msg-reply-card-actions">
                      <button type="button" class="pa-msg-detail-icon-btn" data-reply-toggle aria-expanded="${isOpen ? 'true' : 'false'}" title="Toggle reply" aria-label="Toggle reply"><i class="ri-arrow-down-s-line pa-msg-reply-card-chevron"></i></button>
                      ${canEdit ? `<button type="button" class="pa-msg-detail-icon-btn" data-reply-edit="${escapeHtml(String(r.id))}" title="Edit reply" aria-label="Edit reply"><i class="ri-pencil-line"></i></button>
                      <button type="button" class="pa-msg-detail-icon-btn danger" data-reply-delete="${escapeHtml(String(r.id))}" title="Delete reply" aria-label="Delete reply"><i class="ri-delete-bin-line"></i></button>` : ''}
                    </div>
                  </div>
                  <div class="pa-msg-reply-card-content" id="paMsgReplyContent-${escapeHtml(String(r.id))}">
                    <div class="pa-msg-reply-card-body">${escapeHtml(r.body)}</div>
                    ${r.attachmentName ? `<a class="pa-msg-reply-card-attach" href="${escapeHtml(r.attachmentUrl || '#')}" ${r.attachmentUrl ? 'download' : 'onclick="return false;"'}><i class="ri-attachment-2"></i> ${escapeHtml(r.attachmentName)}</a>` : ''}
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>`;
    }
    body.innerHTML = html;

    if (footer) {
      footer.innerHTML = `<button class="pa-btn pa-btn-primary pa-msg-reply-again-btn" id="paMsgReplyBtn"><i class="ri-reply-line"></i> ${replies.length ? 'Reply Again' : 'Reply to Message'}</button>`;
      $id('paMsgReplyBtn')?.addEventListener('click', () => this.openReplyModal(m.id));
    }

    body.querySelectorAll('[data-reply-edit]').forEach((btn) => {
      btn.addEventListener('click', () => this.openReplyModal(m.id, btn.getAttribute('data-reply-edit')));
    });
    body.querySelectorAll('[data-reply-delete]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const replyId = btn.getAttribute('data-reply-delete');
        requestDelete(replyId, 'message-reply', 'this reply', 'Delete this reply from the thread?');
      });
    });

    this.attachReplyCardCollapseListeners(body);

    $id('paMsgCopyEmail')?.addEventListener('click', () => {
      navigator.clipboard?.writeText(m.email).then(() => this.toast('Email copied to clipboard.', 'success', 1800), () => this.toast('Clipboard not available.', 'danger'));
    });

    const starBtn = $id('paMsgDetailStar');
    if (starBtn) {
      starBtn.innerHTML = m.starred ? '<i class="ri-star-fill"></i>' : '<i class="ri-star-line"></i>';
      starBtn.classList.toggle('starred', !!m.starred);
    }
  }

  attachReplyCardCollapseListeners(root) {
    root?.querySelectorAll('.pa-msg-reply-card').forEach((card) => {
      const toggles = card.querySelectorAll('.pa-msg-reply-card-toggle, [data-reply-toggle]');
      if (!toggles.length) return;

      const setOpen = (open) => {
        card.classList.toggle('is-open', open);
        toggles.forEach((el) => el.setAttribute('aria-expanded', open ? 'true' : 'false'));
      };

      toggles.forEach((toggle) => {
        toggle.addEventListener('click', () => setOpen(!card.classList.contains('is-open')));
      });
    });
  }

  async deleteById(id) {
    const m = this.findById(id);
    if (!m) return;
    const prev = this.store.get('messages');
    this.store.set('messages', prev.filter((x) => !this.sameId(x.id, id)));
    if (this.sameId(this.store.get('selectedId'), id)) this.store.set('selectedId', null);
    try {
      await this.persist();
      this.renderTable();
      this.renderDetail();
      this.statusToast(`Message from "${m.name}" deleted.`, 'danger');
      this.notify(`Deleted message from "${m.name}".`, 'ri-delete-bin-line');
    } catch {
      this.store.set('messages', prev);
      this.statusToast('Could not delete message. Please try again.', 'danger');
    }
  }

  exportCsv() {
    const rows = this.getFiltered();
    const header = ['Name', 'Email', 'Subject', 'Status', 'Date', 'Message'];
    const csvRows = [header.map(csvEscapeField).join(',')];
    rows.forEach((m) => {
      const { date, time } = formatMsgDateTime(m.createdAt);
      csvRows.push([m.name, m.email, m.subject, statusLabel(m.status), `${date} ${time}`, m.message].map(csvEscapeField).join(','));
    });
    const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contact-messages-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    this.toast(`Exported ${rows.length} message${rows.length === 1 ? '' : 's'} to CSV.`, 'success');
    this.notify(`Exported ${rows.length} contact messages.`, 'ri-download-2-line');
  }

  bindEvents() {
    $all('.pa-status-tab').forEach((tab) => {
      this.on(tab, 'click', () => {
        this.store.set('statusFilter', tab.dataset.status);
        this.store.set('page', 1);
        $all('.pa-status-tab').forEach((t) => t.classList.toggle('active', t === tab));
        const statusSelect = $id('paMsgStatusFilter');
        if (statusSelect) statusSelect.value = ['all', 'unread', 'replied', 'spam'].includes(this.store.get('statusFilter')) ? this.store.get('statusFilter') : 'all';
        this.renderTable();
      });
    });

    this.on($id('paMsgStatusFilter'), 'change', (e) => {
      this.store.set('statusFilter', e.target.value);
      this.store.set('page', 1);
      $all('.pa-status-tab').forEach((t) => t.classList.toggle('active', t.dataset.status === this.store.get('statusFilter')));
      this.renderTable();
    });
    this.on($id('paMsgTimeFilter'), 'change', (e) => { this.store.set('timeFilter', e.target.value); this.store.set('page', 1); this.renderTable(); });

    const searchInput = $id('paSearchInput');
    const searchWrap = $id('paSearchWrap');
    const toolbarSearch = $id('paMsgSearchInput');
    const debouncedRender = debounce(() => { this.store.set('page', 1); this.renderTable(); }, 180);

    if (searchInput) {
      this.on(searchInput, 'input', (e) => {
        this.store.set('searchQuery', e.target.value);
        searchWrap?.classList.toggle('has-value', e.target.value.length > 0);
        if (toolbarSearch) toolbarSearch.value = e.target.value;
        debouncedRender();
      });
    }
    this.on($id('paSearchClear'), 'click', () => {
      this.store.set('searchQuery', '');
      if (searchInput) searchInput.value = '';
      searchWrap?.classList.remove('has-value');
      if (toolbarSearch) toolbarSearch.value = '';
      this.store.set('page', 1);
      this.renderTable();
      searchInput?.focus();
    });
    if (toolbarSearch) {
      this.on(toolbarSearch, 'input', (e) => {
        this.store.set('searchQuery', e.target.value);
        if (searchInput) searchInput.value = e.target.value;
        searchWrap?.classList.toggle('has-value', e.target.value.length > 0);
        debouncedRender();
      });
    }

    this.on($id('paMsgExportBtn'), 'click', () => this.exportCsv());

    this.on($id('paMsgDetailStar'), 'click', () => {
      const id = this.store.get('selectedId');
      if (id == null) return;
      const m = this.findById(id);
      if (!m) return;
      m.starred = !m.starred;
      this.persist();
      this.renderDetail();
      this.toast(m.starred ? 'Message starred.' : 'Message unstarred.', 'info', 1500);
    });
    this.on($id('paMsgDetailDelete'), 'click', () => {
      const id = this.store.get('selectedId');
      if (id == null) return;
      const m = this.findById(id);
      if (m) requestDelete(m.id, 'message', m.name, 'Delete this message?');
    });
    this.on($id('paMsgDetailClose'), 'click', () => {
      this.store.set('selectedId', null);
      this.renderTable();
      this.renderDetail();
    });

    registerPanel('paMsgReplyPanel');
    this.on($id('paMsgReplyPanelClose'), 'click', () => this.closeReplyModal());
    this.on($id('paMsgReplyCancel'), 'click', () => this.closeReplyModal());
    this.on($id('paMsgReplySend'), 'click', () => this.submitReplyModal());
    this.on($id('paPanelOverlay'), 'click', (e) => {
      if (e.target.id !== 'paPanelOverlay') return;
      if (!$id('paMsgReplyPanel')?.classList.contains('visible')) return;
      this.closeReplyModal();
    });

    const pickBtn = $id('paMsgReplyPickBtn');
    if (pickBtn) {
      this.on(pickBtn, 'click', () => {
        mediaPicker.open({
          mode: 'attachment',
          folder: 'contact',
          mediaFilter: 'all',
          returnFocus: pickBtn,
          onSelect: (item) => {
            this.setReplyAttachmentFromMedia(item);
            this.toast('Attachment selected from media library', 'success');
          },
        });
      });
    }

    const upload = $id('paMsgReplyUpload');
    const fileInput = $id('paMsgReplyFile');
    if (upload && fileInput) {
      this.on(upload, 'click', (e) => {
        if (e.target === fileInput) return;
        fileInput.click();
      });
      this.on(fileInput, 'change', async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
          this.toast('Attachment must be 5MB or smaller.', 'danger');
          fileInput.value = '';
          return;
        }
        try {
          const contentBase64 = await this.readFileAsBase64(file);
          this.setReplyAttachment(file, contentBase64);
        } catch {
          this.toast('Could not read attachment.', 'danger');
        }
      });
    }

    const mailWrap = $id('paMailPreviewWrap');
    const mailBtn = $id('paMailPreviewBtn');
    if (mailBtn && mailWrap) this.on(mailBtn, 'click', (e) => { e.stopPropagation(); mailWrap.classList.toggle('open'); });
    this.on($id('paHelpBtn'), 'click', () => this.toast('Need a hand? Reach us at support@portfolioadmin.dev', 'info', 3000));

    const avatarWrap = $id('paHeaderAvatarWrap');
    if (avatarWrap) {
      this.on(avatarWrap, 'click', (e) => { e.stopPropagation(); avatarWrap.classList.toggle('open'); });
      avatarWrap.querySelectorAll('.pa-user-dropdown-item').forEach((item) => {
        this.on(item, 'click', (e) => {
          e.stopPropagation();
          avatarWrap.classList.remove('open');
          const spec = item.dataset.toast;
          if (spec) { const [type, msg] = spec.split(':'); this.toast(msg, type); }
          else if (item.id === 'paHeaderLogoutBtn') this.toast('Logging out…', 'info');
        });
      });
    }
    this.on(document, 'click', (e) => {
      if (mailWrap && !mailWrap.contains(e.target)) mailWrap.classList.remove('open');
      if (avatarWrap && !avatarWrap.contains(e.target)) avatarWrap.classList.remove('open');
    });

    this.onBus('confirm:confirmed', ({ id, type }) => {
      if (type === 'message') this.deleteById(this.parseMsgId(id));
      if (type === 'message-reply') this.deleteReply(id);
    });
  }
}