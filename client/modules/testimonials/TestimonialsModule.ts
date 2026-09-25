import { CrudCardModule } from '../../core/CrudCardModule.js';
import { escapeHtml, $id } from '../../utils/dom.js';
import { formatDate, sortByNewestFirst } from '../../utils/format.js';
import { handleFileValidation } from '../../utils/files.js';
import { uploadCmsFileWithPreview } from '../../utils/media-upload.js';
import { renderPaCatCard } from '../../utils/paCatCard.js';
import { categoryKeyFromAccentHex } from '../../utils/categoryClassOptions.js';
import { setStatTrend, setStatValue } from '../../utils/pageStats.js';

export const SEED_TESTIMONIALS = [];

export class TestimonialsModule extends CrudCardModule {
  constructor() {
    super({
      name: 'Testimonials',
      storageKey: 'pa_testimonials',
      deleteType: 'testimonial',
      page: 'testimonials',
      pageSize: 9,
      cardIdAttr: 'data-testi-id',
      bulkLabel: 'testimonial',
      defaultFilters: { rating: 'all' },
      filterSelectIds: [{ id: 'paTestiRatingFilter', key: 'rating' }],
      addFocusId: 'testiAddName',
      editFocusId: 'testiEditName',
      ids: {
        grid: 'paTestiGrid', resultCount: 'paTestiResultCount',
        paginationBtns: 'paTestiPaginationBtns', paginationInfo: 'paTestiPaginationInfo',
        pagePrev: 'paTestiPagePrev', pageNext: 'paTestiPageNext', bodyScroll: 'paTestiBody',
        emptyResetBtn: 'paTestiEmptyResetBtn', emptyAddBtn: 'paTestiEmptyAddBtn',
        addPanel: 'paTestiAddPanel', editPanel: 'paTestiEditPanel',
        addSubmit: 'paTestiAddSubmit', editSubmit: 'paTestiEditSubmit', editDelete: 'paTestiEditDelete',
        addNewBtn: 'paTestiAddNewBtn', addPanelClose: 'paTestiAddPanelClose', editPanelClose: 'paTestiEditPanelClose',
        addCancel: 'paTestiAddCancel', editCancel: 'paTestiEditCancel',
      },
      menuActions: { 'copy-quote': function copyQuote(id) { this.copyQuote(id); } },
    });
    this.addImageData = null;
    this.editImageData = null;
  }

  seedData() { return []; }

  sortRecords(records) { return sortByNewestFirst(records); }

  matchesFilters(record, filters) {
    if (filters.rating !== 'all' && record.rating !== parseInt(filters.rating, 10)) return false;
    return true;
  }

  matchesSearch(record, query) {
    const q = query.trim().toLowerCase();
    return (
      record.name.toLowerCase().includes(q) ||
      (record.role || '').toLowerCase().includes(q) ||
      (record.company || '').toLowerCase().includes(q) ||
      (record.quote || '').toLowerCase().includes(q)
    );
  }

  renderStats() {
    const records = this.store.get('records');
    setStatValue('paTestiStatTotal', records.length);
    setStatValue('paTestiStatFeatured', records.filter((t) => t.featured).length);
    setStatValue('paTestiStatFiveStar', records.filter((t) => t.rating === 5).length);
    setStatValue('paTestiStatHighRated', records.filter((t) => (t.rating || 0) >= 4).length);
    setStatTrend('paTestiStatTotalTrend', records);
    setStatTrend('paTestiStatFeaturedTrend', records, (t) => t.featured);
    setStatTrend('paTestiStatFiveStarTrend', records, (t) => t.rating === 5);
    setStatTrend('paTestiStatHighRatedTrend', records, (t) => (t.rating || 0) >= 4);
  }

  renderCardMenu(t) {
    const id = escapeHtml(String(t.id));
    const name = escapeHtml(t.name);
    return `<div class="pa-card-menu" data-testi-id="${id}">
      <div class="pa-card-menu-item" data-action="duplicate" data-testi-id="${id}"><i class="ri-file-copy-line"></i> Duplicate</div>
      <div class="pa-card-menu-item" data-action="copy-quote" data-testi-id="${id}"><i class="ri-clipboard-line"></i> Copy quote</div>
    </div>`;
  }

  renderCard(t, index) {
    const initials = (t.name || '?').split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();
    const avatar = t.imageUrl
      ? `<img src="${escapeHtml(t.imageUrl)}" alt="${escapeHtml(t.imageAlt || t.name)}" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:inherit;" />`
      : `<span>${escapeHtml(initials)}</span>`;
    const roleLine = [t.role, t.company].filter(Boolean).join(' · ') || 'Client';
    const badge = t.featured ? '<span class="pa-cat-card__builtin">Featured</span>' : '';
    const accent = t.featured ? '#facc15' : '#60a5fa';

    return renderPaCatCard({
      idAttr: 'data-testi-id',
      id: t.id,
      catKey: categoryKeyFromAccentHex(accent) || (t.featured ? 'travel' : 'web'),
      cardClass: this.bulkSelect?.cardClass(t.id) || '',
      animationDelay: 0,
      bulkCheckbox: this.bulkSelect?.checkboxHtml(t.id, `Select ${escapeHtml(t.name)}`) || '',
      iconHtml: `<div class="pa-avatar" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">${avatar}</div>`,
      badge,
      title: t.name,
      slug: roleLine,
      desc: t.quote || '',
      countIcon: 'ri-star-fill',
      countLabel: `${t.rating || 0} star${t.rating === 1 ? '' : 's'}`,
      status: t.featured ? 'Featured' : 'Active',
      dateLabel: 'Added',
      dateValue: formatDate(t.createdAt),
      menuHtml: this.renderCardMenu(t),
    });
  }

  copyQuote(id) {
    const t = this.findById(id);
    if (!t) return;
    navigator.clipboard?.writeText(t.quote).then(
      () => this.toast('Copied quote to clipboard.', 'success', 2000),
      () => this.toast('Clipboard not available.', 'danger'),
    );
  }

  buildDuplicate(record, newId) {
    return { ...record, id: newId, name: `${record.name} (Copy)`, featured: false, createdAt: new Date().toISOString() };
  }

  setAvatarPreview(prefix, dataUrl, alt) {
    const wrap = $id(`${prefix}AvatarPreviewWrap`);
    const img = $id(`${prefix}AvatarPreviewImg`);
    const dz = $id(`${prefix}AvatarDropzone`);
    if (dataUrl) {
      if (img) { img.src = dataUrl; img.alt = alt || ''; }
      if (wrap) wrap.style.display = 'block';
      if (dz) dz.style.display = 'none';
    } else {
      if (wrap) wrap.style.display = 'none';
      if (dz) dz.style.display = 'block';
    }
  }

  setupAvatarDropzone(prefix) {
    const dropzone = $id(`${prefix}AvatarDropzone`);
    const fileInput = $id(`${prefix}AvatarFileInput`);
    const removeBtn = $id(`${prefix}AvatarRemoveBtn`);
    if (!dropzone || !fileInput || dropzone._wired) return;
    dropzone._wired = true;

    const setData = (dataUrl) => {
      if (prefix === 'testiAdd') this.addImageData = dataUrl; else this.editImageData = dataUrl;
      this.setAvatarPreview(prefix, dataUrl);
    };

    this.on(dropzone, 'click', () => fileInput.click());
    this.on(dropzone, 'keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); } });
    dropzone.setAttribute('tabindex', '0');
    dropzone.setAttribute('role', 'button');

    const uploadAvatar = async (file) => {
      const uploaded = await uploadCmsFileWithPreview(file, {
        folder: 'testimonials',
        optimize: { maxWidth: 512, maxHeight: 512, quality: 0.85 },
        onPreview: (previewUrl) => setData(previewUrl),
      });
      setData(uploaded.url);
      this.toast('Photo uploaded', 'success');
    };

    this.on(fileInput, 'change', async () => {
      const file = fileInput.files?.[0];
      fileInput.value = '';
      if (!file || !handleFileValidation(file)) return;
      try {
        await uploadAvatar(file);
      } catch {
        this.toast('Could not upload photo', 'danger');
      }
    });

    ['dragenter', 'dragover'].forEach((evt) => this.on(dropzone, evt, (e) => { e.preventDefault(); dropzone.classList.add('dragover'); }));
    ['dragleave', 'drop'].forEach((evt) => this.on(dropzone, evt, (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); }));
    this.on(dropzone, 'drop', async (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (!file || !handleFileValidation(file)) return;
      try {
        await uploadAvatar(file);
      } catch {
        this.toast('Could not upload photo', 'danger');
      }
    });

    this.on(removeBtn, 'click', (e) => { e.stopPropagation(); setData(null); });
  }

  bindEvents() {
    super.bindEvents();
    this.setupAvatarDropzone('testiAdd');
    this.setupAvatarDropzone('testiEdit');
  }

  resetAddForm() {
    ['testiAddName', 'testiAddRole', 'testiAddCompany', 'testiAddQuote', 'testiAddAlt'].forEach((id) => { const el = $id(id); if (el) el.value = ''; });
    $id('testiAddQuoteCount').textContent = '0';
    $id('testiAddRating').value = '5';
    $id('testiAddFeatured').value = '0';
    this.addImageData = null;
    this.setAvatarPreview('testiAdd', null);
    ['Name', 'Quote'].forEach((f) => {
      $id(`testiAdd${f}Error`)?.classList.remove('visible');
      $id(`testiAdd${f}`)?.classList.remove('error');
    });
  }

  populateEditForm(t) {
    $id('testiEditName').value = t.name;
    $id('testiEditRole').value = t.role || '';
    $id('testiEditCompany').value = t.company || '';
    $id('testiEditQuote').value = t.quote;
    $id('testiEditQuoteCount').textContent = (t.quote || '').length;
    $id('testiEditRating').value = String(t.rating || 5);
    $id('testiEditAlt').value = t.imageAlt || '';
    $id('testiEditFeatured').value = t.featured ? '1' : '0';
    this.editImageData = t.imageUrl || null;
    this.setAvatarPreview('testiEdit', t.imageUrl || null, t.imageAlt);
    ['Name', 'Quote'].forEach((f) => {
      $id(`testiEdit${f}Error`)?.classList.remove('visible');
      $id(`testiEdit${f}`)?.classList.remove('error');
    });
  }

  validateForm(prefix) {
    const p = prefix === 'add' ? 'testiAdd' : 'testiEdit';
    let valid = true;
    const name = ($id(`${p}Name`)?.value || '').trim();
    if (!name) { $id(`${p}Name`)?.classList.add('error'); $id(`${p}NameError`)?.classList.add('visible'); valid = false; }
    else { $id(`${p}Name`)?.classList.remove('error'); $id(`${p}NameError`)?.classList.remove('visible'); }

    const quote = ($id(`${p}Quote`)?.value || '').trim();
    if (!quote) { $id(`${p}Quote`)?.classList.add('error'); $id(`${p}QuoteError`)?.classList.add('visible'); valid = false; }
    else { $id(`${p}Quote`)?.classList.remove('error'); $id(`${p}QuoteError`)?.classList.remove('visible'); }

    return { valid, name, quote };
  }

  buildNewRecord(result) {
    return {
      name: result.name,
      role: $id('testiAddRole').value.trim(),
      company: $id('testiAddCompany').value.trim(),
      quote: result.quote,
      rating: parseInt($id('testiAddRating').value, 10),
      imageUrl: this.addImageData || '',
      imageAlt: $id('testiAddAlt').value.trim(),
      featured: $id('testiAddFeatured').value === '1',
      createdAt: new Date().toISOString(),
    };
  }

  applyEditToRecord(record, result) {
    record.name = result.name;
    record.role = $id('testiEditRole').value.trim();
    record.company = $id('testiEditCompany').value.trim();
    record.quote = result.quote;
    record.rating = parseInt($id('testiEditRating').value, 10);
    record.imageUrl = this.editImageData || '';
    record.imageAlt = $id('testiEditAlt').value.trim();
    record.featured = $id('testiEditFeatured').value === '1';
  }
}
