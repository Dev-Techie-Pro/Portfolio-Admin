import {
  syncPaSelect
} from "./chunk-BHVLEK4H.js";
import {
  addChip,
  getChipValues,
  populateChips,
  setupRte
} from "./chunk-Z6HRAGMQ.js";
import {
  open
} from "./chunk-SUXWAKOI.js";
import "./chunk-YFM5AGT7.js";
import {
  handleFileValidation,
  readFileAsDataUrl
} from "./chunk-QJVHZZLM.js";
import {
  normalizeCategoryKey
} from "./chunk-CP27TRUO.js";
import {
  isValidSlug,
  slugify
} from "./chunk-SCZE3YCL.js";
import {
  CrudCardModule,
  setStatTrend,
  setStatValue
} from "./chunk-GL5MUF35.js";
import "./chunk-JRSPEK52.js";
import {
  formatDate,
  sortByNewestFirst
} from "./chunk-3FVVIY3E.js";
import "./chunk-RDJAJ7S3.js";
import {
  activateTab,
  openPanel
} from "./chunk-WGXNH5AX.js";
import {
  $all,
  $id,
  escapeHtml,
  storage
} from "./chunk-OGR5OR6D.js";

// client/utils/paBlogCard.ts
function getBlogStatusClass(status) {
  return (status || "Draft") === "Published" ? "published" : "draft";
}
function blogTagsHtml(tags, maxVisible = 4) {
  const list = Array.isArray(tags) ? tags : [];
  const visible = list.slice(0, maxVisible);
  const extra = list.length - visible.length;
  let html = visible.map((t) => `<span class="pa-proj-tech pa-proj-tech--blue">${escapeHtml(t)}</span>`).join("");
  if (extra > 0) html += `<span class="pa-proj-tech pa-proj-tech--more">+${extra}</span>`;
  return html;
}
function renderCardMenu(p, idAttr) {
  const id = p.id;
  const title = escapeHtml(p.title);
  return `<div class="pa-card-menu" ${idAttr}="${id}">
    <div class="pa-card-menu-item" data-action="duplicate" ${idAttr}="${id}"><i class="ri-file-copy-line"></i> Duplicate</div>
    <div class="pa-card-menu-item" data-action="copy-slug" ${idAttr}="${id}"><i class="ri-links-line"></i> Copy slug URL</div>
  </div>`;
}
function renderActions(p, idAttr) {
  const id = p.id;
  const title = escapeHtml(p.title);
  return `<button type="button" class="pa-action-btn pa-action-edit" title="Edit post" ${idAttr}="${id}" aria-label="Edit ${title}"><i class="ri-pencil-line"></i></button>
    <button type="button" class="pa-action-btn pa-action-delete" title="Delete post" ${idAttr}="${id}" aria-label="Delete ${title}"><i class="ri-delete-bin-line"></i></button>`;
}
function renderMeta(p) {
  const published = formatDate(p.publishedAt || p.createdAt);
  const slug = escapeHtml(p.slug || "\u2014");
  const tagCount = Array.isArray(p.tags) ? p.tags.length : 0;
  return `<div class="pa-proj-card__meta-item">
      <i class="ri-calendar-line" aria-hidden="true"></i>
      <span class="pa-proj-card__meta-label">Published</span>
      <span class="pa-proj-card__meta-value">${escapeHtml(published)}</span>
    </div>
    <div class="pa-proj-card__meta-item">
      <i class="ri-link" aria-hidden="true"></i>
      <span class="pa-proj-card__meta-label">Slug</span>
      <span class="pa-proj-card__meta-value">${slug}</span>
    </div>
    <div class="pa-proj-card__meta-item">
      <i class="ri-price-tag-3-line" aria-hidden="true"></i>
      <span class="pa-proj-card__meta-label">Tags</span>
      <span class="pa-proj-card__meta-value">${tagCount}</span>
    </div>
    <div class="pa-proj-card__meta-item pa-proj-card__meta-item--demo">
      <i class="ri-article-line" aria-hidden="true"></i>
      <span class="pa-proj-card__meta-label">Status</span>
      <span class="pa-proj-card__meta-value">${escapeHtml(p.status || "Draft")}</span>
    </div>`;
}
function renderPaBlogCard(p, opts = {}) {
  const {
    meta = { label: p.category, cls: "" },
    thumbHtml,
    bulkCheckbox = "",
    cardClass = "",
    animationDelay = 0,
    idAttr = "data-blog-id"
  } = opts;
  const id = p.id;
  const title = escapeHtml(p.title);
  const category = escapeHtml(meta.label || p.category || "\u2014");
  const desc = escapeHtml(p.excerpt || "");
  const statusClass = getBlogStatusClass(p.status);
  const statusLabel = p.status || "Draft";
  const featuredBadge = p.featured ? '<span class="pa-proj-card__featured"><i class="ri-star-fill"></i> FEATURED</span>' : "";
  const statusBadge = `<span class="pa-proj-card__status pa-proj-card__status--${statusClass}"><span class="pa-proj-card__status-dot" aria-hidden="true"></span>${escapeHtml(statusLabel)}</span>`;
  const tagsHtml = blogTagsHtml(p.tags);
  const metaHtml = renderMeta(p);
  const actionsHtml = renderActions(p, idAttr);
  const menuHtml = renderCardMenu(p, idAttr);
  const catKey = escapeHtml(normalizeCategoryKey(meta.catKey || p.category));
  return `<div class="pa-card pa-proj-card pa-blog-card${cardClass}" ${idAttr}="${id}" data-cat-key="${catKey}" style="animation-delay:${animationDelay}ms;">
    ${bulkCheckbox}
    <div class="pa-proj-card__grid">
      <div class="pa-proj-card__thumb">
        <div class="pa-proj-card__thumb-inner">${thumbHtml}</div>
        ${featuredBadge}
        ${statusBadge}
      </div>
      <div class="pa-proj-card__body">
        <div class="pa-proj-card__head">
          <div class="pa-proj-card__title-wrap">
            <span class="pa-proj-card__type-icon" aria-hidden="true"><i class="ri-article-line"></i></span>
            <div class="pa-proj-card__title-block">
              <h3 class="pa-proj-card__title" title="${title}">${title}</h3>
              <div class="pa-proj-card__category"><i class="ri-price-tag-3-line"></i> ${category}</div>
            </div>
          </div>
          <div class="pa-proj-card__head-more">
            <button type="button" class="pa-action-btn pa-action-more" ${idAttr}="${id}" title="More options" aria-label="More options for ${title}"><i class="ri-more-2-fill"></i></button>
            ${menuHtml}
          </div>
        </div>
        <p class="pa-proj-card__desc">${desc}</p>
        <div class="pa-proj-card__tags">${tagsHtml}</div>
        <div class="pa-proj-card__meta">${metaHtml}</div>
        <div class="pa-proj-card__footer">
          <div class="pa-proj-card__actions">${actionsHtml}</div>
        </div>
      </div>
    </div>
    <div class="pa-proj-card__list">
      <div class="pa-proj-card__list-thumb">
        <div class="pa-proj-card__thumb-inner">${thumbHtml}</div>
        ${featuredBadge}
      </div>
      <div class="pa-proj-card__list-main">
        <div class="pa-proj-card__list-top">
          <div class="pa-proj-card__title-block">
            <h3 class="pa-proj-card__title" title="${title}">${title}</h3>
            <div class="pa-proj-card__category"><i class="ri-price-tag-3-line"></i> ${category}</div>
          </div>
          <div class="pa-proj-card__list-status-wrap">
            ${statusBadge}
            <div class="pa-proj-card__list-more">
              <button type="button" class="pa-action-btn pa-action-more" ${idAttr}="${id}" title="More options" aria-label="More options for ${title}"><i class="ri-more-2-fill"></i></button>
              ${menuHtml}
            </div>
          </div>
        </div>
        <p class="pa-proj-card__desc">${desc}</p>
        <div class="pa-proj-card__tags">${tagsHtml}</div>
      </div>
      <div class="pa-proj-card__list-meta">${metaHtml}</div>
      <div class="pa-proj-card__list-actions">${actionsHtml}</div>
    </div>
  </div>`;
}

// client/modules/blog/BlogModule.ts
var SEED_BLOG_POSTS = [];
var BlogModule = class extends CrudCardModule {
  constructor() {
    super({
      name: "BlogPosts",
      storageKey: "pa_blog_posts",
      deleteType: "blogpost",
      page: "blogposts",
      pageSize: 9,
      cardIdAttr: "data-blog-id",
      defaultFilters: { category: "all" },
      filterSelectIds: [{ id: "paBlogCategoryFilter", key: "category" }],
      addFocusId: "blogAddTitle",
      editFocusId: "blogEditTitle",
      tabGroup: null,
      bulkLabel: "post",
      ids: {
        grid: "paBlogGrid",
        resultCount: "paBlogResultCount",
        paginationBtns: "paBlogPaginationBtns",
        paginationInfo: "paBlogPaginationInfo",
        pagePrev: "paBlogPagePrev",
        pageNext: "paBlogPageNext",
        bodyScroll: "paBlogBody",
        emptyResetBtn: "paBlogEmptyResetBtn",
        emptyAddBtn: "paBlogEmptyAddBtn",
        addPanel: "paBlogAddPanel",
        editPanel: "paBlogEditPanel",
        addSubmit: "paBlogAddSubmit",
        editSubmit: "paBlogEditSubmit",
        editDelete: "paBlogEditDelete",
        addNewBtn: "paBlogAddNewBtn",
        addPanelClose: "paBlogAddPanelClose",
        editPanelClose: "paBlogEditPanelClose",
        addCancel: "paBlogAddCancel",
        editCancel: "paBlogEditCancel"
      },
      menuActions: { "copy-slug": function copySlug(id) {
        this.copySlugUrl(id);
      } }
    });
    this.addImageData = null;
    this.editImageData = null;
    this.addSlugTouched = false;
    this.editSlugTouched = false;
    this.store.set("blogTabFilter", "all");
  }
  seedData() {
    return [];
  }
  getCategoryMeta(key) {
    const cat = (this._blogCategories || []).find((c) => c.key === key);
    return cat ? { label: cat.label, catKey: cat.key } : { label: key || "Uncategorized", catKey: key };
  }
  async load() {
    const [records, categories] = await Promise.all([
      this.loadRecords(() => SEED_BLOG_POSTS),
      storage.get("pa_blog_categories", [])
    ]);
    this._blogCategories = Array.isArray(categories) ? categories : [];
    this._populateCategorySelects();
    this._populateCategoryFilter();
    try {
      const pendingCat = sessionStorage.getItem("pa_blog_cat_filter");
      if (pendingCat) {
        sessionStorage.removeItem("pa_blog_cat_filter");
        this.store.set("filters", { ...this.store.get("filters"), category: pendingCat });
      }
    } catch {
    }
    const maxId = Math.max(0, ...records.map((r) => Number(r.id) || 0));
    this.nextId = maxId + 1;
    this.store.set("records", records);
  }
  render() {
    this._populateCategoryFilter();
    super.render();
  }
  _populateCategoryFilter() {
    const select = $id("paBlogCategoryFilter");
    if (!select) return;
    const current = this.store.get("filters")?.category || "all";
    const sorted = sortByNewestFirst(this._blogCategories || []);
    select.innerHTML = '<option value="all">All categories</option>' + sorted.map((c) => `<option value="${escapeHtml(c.key)}">${escapeHtml(c.label)}</option>`).join("");
    select.value = current;
    syncPaSelect(select);
  }
  _populateCategorySelects() {
    const sorted = sortByNewestFirst(this._blogCategories || []);
    const options = sorted.map((c) => `<option value="${escapeHtml(c.key)}">${escapeHtml(c.label)}</option>`).join("");
    const placeholder = '<option value="">Select category</option>';
    const addSelect = $id("blogAddCategory");
    const editSelect = $id("blogEditCategory");
    if (addSelect) {
      addSelect.innerHTML = placeholder + options;
      syncPaSelect(addSelect);
    }
    if (editSelect) {
      editSelect.innerHTML = placeholder + options;
      syncPaSelect(editSelect);
    }
  }
  getFiltered() {
    const results = super.getFiltered();
    const tab = this.store.get("blogTabFilter") || "all";
    if (tab === "featured") return results.filter((p) => p.featured);
    if (tab === "published") return results.filter((p) => p.status === "Published");
    if (tab === "drafts") return results.filter((p) => p.status !== "Published");
    return results;
  }
  renderStats() {
    const records = this.store.get("records");
    setStatValue("paBlogStatTotal", records.length);
    setStatValue("paBlogStatPublished", records.filter((p) => p.status === "Published").length);
    setStatValue("paBlogStatDrafts", records.filter((p) => p.status !== "Published").length);
    setStatValue("paBlogStatFeatured", records.filter((p) => p.featured).length);
    setStatTrend("paBlogStatTotalTrend", records);
    setStatTrend("paBlogStatPublishedTrend", records, (p) => p.status === "Published");
    setStatTrend("paBlogStatDraftsTrend", records, (p) => p.status !== "Published");
    setStatTrend("paBlogStatFeaturedTrend", records, (p) => p.featured);
  }
  syncStatusTabs() {
    const filter = this.store.get("blogTabFilter") || "all";
    $all("#paBlogStatusTabs .pa-status-tab").forEach((tab) => {
      const active = tab.dataset.blogFilter === filter;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
  }
  onAfterRender() {
    this.syncStatusTabs();
  }
  sortRecords(records) {
    return sortByNewestFirst(records);
  }
  matchesFilters(record, filters) {
    if (filters.category !== "all" && record.category !== filters.category) return false;
    return true;
  }
  resetFilters() {
    super.resetFilters();
    this.store.set("blogTabFilter", "all");
  }
  matchesSearch(record, query) {
    const q = query.trim().toLowerCase();
    return record.title.toLowerCase().includes(q) || record.slug.toLowerCase().includes(q) || (record.excerpt || "").toLowerCase().includes(q) || record.tags.some((t) => t.toLowerCase().includes(q)) || (this.getCategoryMeta(record.category)?.label || "").toLowerCase().includes(q);
  }
  getDeleteName(record) {
    return record.title;
  }
  renderCard(p, index) {
    const meta = this.getCategoryMeta(p.category);
    const thumb = p.imageUrl ? `<img class="pa-thumb-img" src="${escapeHtml(p.imageUrl)}" alt="${escapeHtml(p.imageAlt || p.title)}" loading="lazy" />` : `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;"><i class="ri-article-line" style="font-size:34px;color:var(--pa-text-ghost);"></i></div>`;
    return renderPaBlogCard(p, {
      meta,
      thumbHtml: thumb,
      bulkCheckbox: this.bulkSelect?.checkboxHtml(p.id, `Select ${escapeHtml(p.title)}`) || "",
      cardClass: this.bulkSelect?.cardClass(p.id) || "",
      animationDelay: Math.min(index, 11) * 35,
      idAttr: "data-blog-id"
    });
  }
  attachCardListeners() {
    super.attachCardListeners();
    const grid = $id("paBlogGrid");
    if (!grid) return;
    grid.querySelectorAll(".pa-proj-card__details-btn").forEach((btn) => {
      this.on(btn, "click", (e) => {
        e.stopPropagation();
        const id = btn.getAttribute("data-blog-id");
        if (id) this.openEditPanel(id);
      });
    });
  }
  copySlugUrl(id) {
    const p = this.findById(id);
    if (!p) return;
    navigator.clipboard?.writeText(`/blog/${p.slug}`).then(() => this.toast("Slug URL copied to clipboard", "success"));
  }
  buildDuplicate(record, newId) {
    let slug = `${record.slug}-copy`;
    let suffix = 2;
    const slugs = new Set(this.store.get("records").map((r) => r.slug));
    while (slugs.has(slug)) slug = `${record.slug}-copy-${suffix++}`;
    return { ...record, id: newId, title: `${record.title} (Copy)`, slug, status: "Draft", featured: false, tags: [...record.tags], createdAt: (/* @__PURE__ */ new Date()).toISOString() };
  }
  setFeaturedPreview(prefix, dataUrl, alt) {
    const wrap = $id(`${prefix}ImagePreviewWrap`);
    const img = $id(`${prefix}ImagePreviewImg`);
    const dz = $id(`${prefix}ImageDropzone`);
    if (dataUrl) {
      if (img) {
        img.src = dataUrl;
        img.alt = alt || "";
      }
      if (wrap) wrap.style.display = "block";
      if (dz) dz.style.display = "none";
    } else {
      if (wrap) wrap.style.display = "none";
      if (dz) dz.style.display = "block";
    }
  }
  async persist() {
    await this.saveRecords(this.store.get("records"));
    await storage.get("pa_media_library", []).catch(() => []);
  }
  setupMediaPicker(prefix) {
    const btn = $id(`${prefix}FeaturedPickBtn`);
    if (!btn) return;
    this.on(btn, "click", () => {
      open({
        mode: "featured",
        folder: "blog",
        returnFocus: btn,
        onSelect: (item) => {
          if (prefix === "blogAdd") this.addImageData = item.url;
          else this.editImageData = item.url;
          const altEl = $id(`${prefix}ImageAlt`);
          if (altEl && item.alt && !altEl.value.trim()) altEl.value = item.alt;
          this.setFeaturedPreview(prefix, item.url, item.alt || altEl?.value || "");
          this.toast("Featured image selected from media library", "success");
        }
      });
    });
  }
  setupImageDropzone(prefix) {
    const dropzone = $id(`${prefix}ImageDropzone`);
    const fileInput = $id(`${prefix}ImageFileInput`);
    const removeBtn = $id(`${prefix}ImageRemoveBtn`);
    if (!dropzone || !fileInput || dropzone._wired) return;
    dropzone._wired = true;
    const setData = (dataUrl) => {
      if (prefix === "blogAdd") this.addImageData = dataUrl;
      else this.editImageData = dataUrl;
      this.setFeaturedPreview(prefix, dataUrl);
    };
    this.on(dropzone, "click", () => fileInput.click());
    this.on(fileInput, "change", async () => {
      const file = fileInput.files?.[0];
      fileInput.value = "";
      if (!file || !handleFileValidation(file)) return;
      setData(await readFileAsDataUrl(file));
    });
    ["dragenter", "dragover"].forEach((evt) => this.on(dropzone, evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    }));
    ["dragleave", "drop"].forEach((evt) => this.on(dropzone, evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    }));
    this.on(dropzone, "drop", async (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (!file || !handleFileValidation(file)) return;
      setData(await readFileAsDataUrl(file));
    });
    this.on(removeBtn, "click", (e) => {
      e.stopPropagation();
      setData(null);
    });
  }
  bindEvents() {
    super.bindEvents();
    $all("#paBlogStatusTabs .pa-status-tab").forEach((tab) => {
      this.on(tab, "click", () => {
        this.store.update({ blogTabFilter: tab.dataset.blogFilter || "all", page: 1 });
        this.render();
      });
    });
    this.setupImageDropzone("blogAdd");
    this.setupImageDropzone("blogEdit");
    this.setupMediaPicker("blogAdd");
    this.setupMediaPicker("blogEdit");
    setupRte("blogAddRteWrap", "blogAddContent");
    setupRte("blogEditRteWrap", "blogEditContent");
    this.on($id("blogAddTitle"), "input", (e) => {
      if (!this.addSlugTouched) $id("blogAddSlug").value = slugify(e.target.value);
    });
    this.on($id("blogAddSlug"), "input", () => {
      this.addSlugTouched = true;
    });
    this.on($id("blogEditTitle"), "input", (e) => {
      if (!this.editSlugTouched) $id("blogEditSlug").value = slugify(e.target.value);
    });
    this.on($id("blogEditSlug"), "input", () => {
      this.editSlugTouched = true;
    });
    this.on($id("blogAddTagInput"), "keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addChip($id("blogAddTagChips"), e.target.value);
        e.target.value = "";
      }
    });
    this.on($id("blogEditTagInput"), "keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addChip($id("blogEditTagChips"), e.target.value);
        e.target.value = "";
      }
    });
  }
  openAddPanel() {
    this.resetAddForm();
    this._populateCategorySelects();
    openPanel(this.config.ids.addPanel, [this.config.ids.editPanel]);
    activateTab("blogAdd", "content");
    setTimeout(() => $id("blogAddTitle")?.focus(), 320);
  }
  openEditPanel(id) {
    const record = this.findById(id);
    if (!record) return;
    this.currentEditId = id;
    this._populateCategorySelects();
    this.populateEditForm(record);
    openPanel(this.config.ids.editPanel, [this.config.ids.addPanel]);
    activateTab("blogEdit", "content");
    setTimeout(() => $id("blogEditTitle")?.focus(), 320);
  }
  resetAddForm() {
    ["blogAddTitle", "blogAddSlug", "blogAddCategory", "blogAddExcerpt", "blogAddImageAlt", "blogAddSortOrder"].forEach((id) => {
      const el = $id(id);
      if (el) el.value = "";
    });
    $id("blogAddExcerptCount").textContent = "0";
    $id("blogAddExcerptCount").parentElement.classList.remove("warn", "max");
    $id("blogAddContent").innerHTML = "";
    $id("blogAddTagChips").innerHTML = "";
    $id("blogAddTagInput").value = "";
    $id("blogAddStatus").value = "Draft";
    $id("blogAddFeatured").value = "0";
    $id("blogAddPublishedDate").value = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    this.addImageData = null;
    this.addSlugTouched = false;
    this.setFeaturedPreview("blogAdd", null);
    ["Title", "Slug", "Category", "Excerpt", "Content"].forEach((f) => {
      $id(`blogAdd${f}Error`)?.classList.remove("visible");
      $id(f === "Content" ? "blogAddRteWrap" : `blogAdd${f}`)?.classList.remove("error");
    });
  }
  populateEditForm(p) {
    this.editSlugTouched = true;
    $id("blogEditTitle").value = p.title;
    $id("blogEditSlug").value = p.slug;
    $id("blogEditCategory").value = p.category;
    $id("blogEditExcerpt").value = p.excerpt;
    $id("blogEditExcerptCount").textContent = p.excerpt.length;
    $id("blogEditContent").innerHTML = escapeHtml(p.content || "");
    populateChips($id("blogEditTagChips"), p.tags);
    $id("blogEditImageAlt").value = p.imageAlt || "";
    $id("blogEditStatus").value = p.status || "Draft";
    $id("blogEditFeatured").value = p.featured ? "1" : "0";
    $id("blogEditPublishedDate").value = p.publishedAt || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    $id("blogEditSortOrder").value = p.sortOrder != null ? String(p.sortOrder) : "";
    this.editImageData = p.imageUrl || null;
    this.setFeaturedPreview("blogEdit", p.imageUrl || null, p.imageAlt);
    ["Title", "Slug", "Category", "Excerpt", "Content"].forEach((f) => {
      $id(`blogEdit${f}Error`)?.classList.remove("visible");
      $id(f === "Content" ? "blogEditRteWrap" : `blogEdit${f}`)?.classList.remove("error");
    });
  }
  validateForm(prefix) {
    let valid = true;
    const p = prefix === "add" ? "blogAdd" : "blogEdit";
    const title = $id(`${p}Title`).value.trim();
    this._toggleErr(`${p}Title`, !title);
    if (!title) valid = false;
    const slugEl = $id(`${p}Slug`);
    const slug = slugEl.value.trim();
    const slugErr = $id(`${p}SlugError`);
    if (!slug) {
      slugEl.classList.add("error");
      if (slugErr) {
        slugErr.classList.add("visible");
        slugErr.querySelector("span").textContent = "URL slug is required";
      }
      valid = false;
    } else if (!isValidSlug(slug)) {
      slugEl.classList.add("error");
      if (slugErr) {
        slugErr.classList.add("visible");
        slugErr.querySelector("span").textContent = 'Slug must be lowercase letters, digits, or hyphens (e.g. "my-post-title")';
      }
      valid = false;
    } else {
      const editingId = p === "blogEdit" ? this.currentEditId : null;
      const duplicate = this.store.get("records").find((post) => post.slug === slug && String(post.id) !== String(editingId));
      if (duplicate) {
        slugEl.classList.add("error");
        if (slugErr) {
          slugErr.classList.add("visible");
          slugErr.querySelector("span").textContent = `Slug "${slug}" is already in use`;
        }
        valid = false;
      } else {
        slugEl.classList.remove("error");
        slugErr?.classList.remove("visible");
      }
    }
    const category = $id(`${p}Category`).value;
    this._toggleErr(`${p}Category`, !category);
    if (!category) valid = false;
    const excerpt = $id(`${p}Excerpt`).value.trim();
    this._toggleErr(`${p}Excerpt`, !excerpt);
    if (!excerpt) valid = false;
    const contentEl = $id(`${p}Content`);
    const content = contentEl.textContent.trim();
    $id(`${p}ContentError`)?.classList.toggle("visible", !content);
    $id(`${p}RteWrap`)?.classList.toggle("error", !content);
    if (!content) valid = false;
    const tags = getChipValues($id(`${p}TagChips`));
    if (!valid) activateTab(p, "content");
    return { valid, title, slug, category, excerpt, content, tags };
  }
  _toggleErr(id, isError) {
    $id(id)?.classList.toggle("error", isError);
    $id(`${id}Error`)?.classList.toggle("visible", isError);
  }
  buildNewRecord(f) {
    const publishedDate = $id("blogAddPublishedDate").value;
    const sortOrderRaw = $id("blogAddSortOrder").value;
    return {
      title: f.title,
      slug: f.slug,
      category: f.category,
      excerpt: f.excerpt,
      content: f.content,
      tags: f.tags,
      status: $id("blogAddStatus").value,
      featured: $id("blogAddFeatured").value === "1",
      imageUrl: this.addImageData || "",
      imageAlt: $id("blogAddImageAlt").value.trim(),
      publishedAt: publishedDate || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      sortOrder: sortOrderRaw ? parseInt(sortOrderRaw, 10) : this.store.get("records").length + 1,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
  }
  applyEditToRecord(record, f) {
    record.title = f.title;
    record.slug = f.slug;
    record.category = f.category;
    record.excerpt = f.excerpt;
    record.content = f.content;
    record.tags = f.tags;
    record.status = $id("blogEditStatus").value;
    record.featured = $id("blogEditFeatured").value === "1";
    record.imageUrl = this.editImageData || "";
    record.imageAlt = $id("blogEditImageAlt").value.trim();
    const publishedDate = $id("blogEditPublishedDate").value;
    record.publishedAt = publishedDate || record.publishedAt;
    const sortOrderRaw = $id("blogEditSortOrder").value;
    record.sortOrder = sortOrderRaw ? parseInt(sortOrderRaw, 10) : record.sortOrder;
  }
};
export {
  BlogModule
};
