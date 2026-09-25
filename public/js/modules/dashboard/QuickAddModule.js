import { Module } from "../../core/Module.js";
import { storage } from "../../core/StorageService.js";
import { $id, escapeHtml } from "../../utils/dom.js";
import { isValidUrl, isValidSlug, slugify } from "../../utils/strings.js";
import { handleFileValidation } from "../../utils/files.js";
import { uploadCmsFileWithPreview } from "../../utils/media-upload.js";
import { setupRte } from "../../utils/rte.js";
import { addChip, getChipValues } from "../../utils/chips.js";
import { parseSortInput, sortByNewestFirst } from "../../utils/format.js";
import { showStatusToast } from "../shell/toast.js";
import { closePanels, openPanel, activateTab, activateWizardStep, registerPanel } from "../shell/panels.js";
import { CATEGORY_META_PROJECTS, pickSceneForCategory } from "../projects/ProjectsModule.js";
function setVal(id, value) {
  const el = $id(id);
  if (el && "value" in el) el.value = value;
}
function setHtml(id, html) {
  const el = $id(id);
  if (el) el.innerHTML = html;
}
function setText(id, text) {
  const el = $id(id);
  if (el) el.textContent = text;
}
function setDisplay(id, display) {
  const el = $id(id);
  if (el) el.style.display = display;
}
const TAB_META = {
  project: { subtitle: "Create a new item and fill in the details below.", submit: "Add Project", wizard: true, steps: ["basic", "media", "technologies", "additional"] },
  testimonial: { subtitle: "Add a client testimonial to your portfolio.", submit: "Add Testimonial", wizard: false },
  experience: { subtitle: "Add a work experience entry.", submit: "Add Experience", wizard: true, steps: ["details", "dates"] },
  blog: { subtitle: "Write and publish a new blog post.", submit: "Add Blog Post", wizard: true, steps: ["content", "publishing"] }
};
const STEP_LABELS = {
  project: { basic: "Next: Media", media: "Next: Technologies", technologies: "Next: Additional", additional: "Add Project" },
  experience: { details: "Next: Dates", dates: "Add Experience" },
  blog: { content: "Next: Publishing", publishing: "Add Blog Post" }
};
class QuickAddModule extends Module {
  constructor(dashboardModule) {
    super({ name: "QuickAdd" });
    this.dashboard = dashboardModule;
    this.activeTab = "project";
    this.wizardStep = {};
    Object.keys(TAB_META).forEach((k) => {
      if (TAB_META[k].wizard) this.wizardStep[k] = TAB_META[k].steps[0];
    });
    this.prjFeaturedImage = null;
    this.prjGalleryImages = [];
    this.testiImage = null;
    this.blogImage = null;
    this.blogSlugTouched = false;
    this.nextIds = { project: 1, testimonial: 1, experience: 1, blog: 1 };
  }
  async initIds() {
    const [projects, testi, exp, blog, categories, blogCategories] = await Promise.all([
      storage.get("pa_projects", []),
      storage.get("pa_testimonials", []),
      storage.get("pa_experience", []),
      storage.get("pa_blog_posts", []),
      storage.get("pa_category_meta", {}),
      storage.get("pa_blog_categories", [])
    ]);
    this.nextIds.project = Math.max(0, ...(projects || []).map((p) => p.id)) + 1;
    this.nextIds.testimonial = Math.max(0, ...(testi || []).map((t) => t.id)) + 1;
    this.nextIds.experience = Math.max(0, ...(exp || []).map((e) => e.id)) + 1;
    this.nextIds.blog = Math.max(0, ...(blog || []).map((b) => b.id)) + 1;
    this.categoriesMap = categories && typeof categories === "object" ? categories : {};
    this.blogCategories = Array.isArray(blogCategories) ? blogCategories : [];
    this.populateProjectCategories();
    this.populateBlogCategories();
  }
  populateBlogCategories() {
    const sel = $id("qaBlogCategory");
    if (!sel) return;
    const current = sel.value;
    const sorted = sortByNewestFirst(this.blogCategories);
    sel.innerHTML = '<option value="">Select category</option>' + sorted.map((c) => `<option value="${escapeHtml(c.key)}">${escapeHtml(c.label)}</option>`).join("");
    if (current) sel.value = current;
  }
  populateProjectCategories() {
    const sel = $id("qaPrjCategory");
    if (!sel) return;
    const keys = /* @__PURE__ */ new Set([...Object.keys(CATEGORY_META_PROJECTS), ...Object.keys(this.categoriesMap || {})]);
    const current = sel.value;
    sel.innerHTML = '<option value="">Select category</option>' + [...keys].map((k) => {
      const label = this.categoriesMap[k]?.label || CATEGORY_META_PROJECTS[k]?.label || k;
      return `<option value="${k}">${label}</option>`;
    }).join("");
    if (current) sel.value = current;
  }
  bindEvents() {
    registerPanel("paQuickAddPanel");
    $id("paAddNewBtn")?.addEventListener("click", () => this.open());
    $id("paQuickAddPanelClose")?.addEventListener("click", closePanels);
    $id("qaCancel")?.addEventListener("click", closePanels);
    document.querySelectorAll('.pa-qa-top-tab[data-panel="quickAdd"], .pa-qa-bottom-tab[data-panel="quickAdd"]').forEach((btn) => {
      btn.addEventListener("click", () => this.switchTab(btn.dataset.tab));
    });
    $id("qaPrimaryBtn")?.addEventListener("click", () => {
      void this.onPrimary();
    });
    $id("qaPrevBtn")?.addEventListener("click", () => this.onPrev());
    document.querySelectorAll(".pa-qa-wizard-steps .pa-qa-step").forEach((btn) => {
      btn.addEventListener("click", () => {
        const entity = btn.closest(".pa-qa-wizard")?.dataset.qaEntity;
        if (!entity) return;
        this.wizardStep[entity] = btn.dataset.wizardStep;
        this.updateWizardUi(entity);
      });
    });
    this.wireProjectForm();
    this.wireTestimonialForm();
    this.wireExperienceForm();
    this.wireBlogForm();
    setupRte("qaPrjRteWrap", "qaPrjFullDesc");
    setupRte("qaBlogRteWrap", "qaBlogContent");
  }
  open(tab = "project") {
    void this.initIds();
    this.switchTab(tab);
    openPanel("paQuickAddPanel");
    setTimeout(() => {
      const focusMap = {
        project: "qaPrjTitle",
        testimonial: "qaTestiName",
        experience: "qaExpTitle",
        blog: "qaBlogTitle"
      };
      const el = $id(focusMap[tab]);
      if (el?.focus) el.focus();
      else el?.click?.();
    }, 320);
  }
  switchTab(tab) {
    this.activeTab = tab;
    activateTab("quickAdd", tab);
    const meta = TAB_META[tab];
    const sub = $id("paQuickAddSubtitle");
    if (sub) sub.textContent = meta.subtitle;
    if (meta.wizard) {
      this.wizardStep[tab] = meta.steps[0];
      activateWizardStep(tab, meta.steps[0]);
    }
    this.resetForm(tab);
    this.updateFooter();
  }
  updateFooter() {
    const meta = TAB_META[this.activeTab];
    const prev = $id("qaPrevBtn");
    const label = $id("qaPrimaryBtnLabel");
    if (meta.wizard) {
      const step = this.wizardStep[this.activeTab];
      const steps = meta.steps;
      const idx = steps.indexOf(step);
      if (prev) prev.style.display = idx > 0 ? "" : "none";
      if (label) label.textContent = STEP_LABELS[this.activeTab]?.[step] || meta.submit;
    } else {
      if (prev) prev.style.display = "none";
      if (label) label.textContent = meta.submit;
    }
  }
  updateWizardUi(entity) {
    const step = this.wizardStep[entity];
    activateWizardStep(entity, step);
    const meta = TAB_META[entity];
    const steps = meta.steps;
    const idx = steps.indexOf(step);
    const badge = $id(`qa${entity}StepBadge`);
    if (badge) badge.textContent = `Step ${idx + 1} of ${steps.length}`;
    const stepBtn = document.querySelector(`.pa-qa-wizard[data-qa-entity="${entity}"] .pa-qa-step[data-wizard-step="${step}"]`);
    const title = $id(`qa${entity}StepTitle`);
    const sub = $id(`qa${entity}StepSub`);
    if (title && stepBtn) title.textContent = stepBtn.querySelector(".pa-qa-step-label")?.textContent || "";
    if (sub && stepBtn) sub.textContent = stepBtn.dataset.stepDesc || "";
    this.updateFooter();
  }
  onPrev() {
    const meta = TAB_META[this.activeTab];
    if (!meta.wizard) return;
    const steps = meta.steps;
    const idx = steps.indexOf(this.wizardStep[this.activeTab]);
    if (idx > 0) {
      this.wizardStep[this.activeTab] = steps[idx - 1];
      this.updateWizardUi(this.activeTab);
    }
  }
  async onPrimary() {
    const meta = TAB_META[this.activeTab];
    if (meta.wizard) {
      const steps = meta.steps;
      const idx = steps.indexOf(this.wizardStep[this.activeTab]);
      if (idx < steps.length - 1) {
        if (!this.validateStep(this.activeTab, this.wizardStep[this.activeTab])) return;
        this.wizardStep[this.activeTab] = steps[idx + 1];
        this.updateWizardUi(this.activeTab);
        return;
      }
    }
    await this.submit();
  }
  async submit() {
    const handlers = {
      project: () => this.submitProject(),
      testimonial: () => this.submitTestimonial(),
      experience: () => this.submitExperience(),
      blog: () => this.submitBlog()
    };
    try {
      const ok = await handlers[this.activeTab]();
      if (!ok) return;
      storage.invalidate("pa_recent_activities");
      await this.dashboard.reload();
      const keepOpen = $id("qaKeepOpen")?.checked;
      if (keepOpen) {
        this.resetForm(this.activeTab);
      } else {
        closePanels();
      }
    } catch {
      this.statusToast("Could not save. Please try again.", "danger");
    }
  }
  // ─── Validation helpers ───────────────────────────────────────────
  showErr(id, show) {
    $id(id)?.classList.toggle("error", show);
    $id(`${id}Error`)?.classList.toggle("visible", show);
  }
  setFieldError(id, valid, message) {
    const input = $id(id);
    const err = $id(`${id}Error`);
    input?.classList.toggle("error", !valid);
    err?.classList.toggle("visible", !valid);
    if (!valid && message) {
      const span = err?.querySelector("span");
      if (span) span.textContent = message;
    }
  }
  validateStep(tab, step) {
    if (tab === "project" && step === "basic") return this.validateProjectBasic();
    if (tab === "project" && step === "technologies") return this.validateProjectTechnologies();
    if (tab === "experience" && step === "details") return this.validateExpDetails();
    if (tab === "blog" && step === "content") return this.validateBlogContent();
    return true;
  }
  // ─── Project ──────────────────────────────────────────────────────
  wireProjectForm() {
    this.on($id("qaPrjTechInput"), "keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addChip($id("qaPrjTechChips"), e.target.value);
        e.target.value = "";
      }
    });
    this.on($id("qaPrjTechAddBtn"), "click", () => {
      const input = $id("qaPrjTechInput");
      addChip($id("qaPrjTechChips"), input.value);
      input.value = "";
    });
    this.on($id("qaPrjShortDesc"), "input", (e) => {
      const c = $id("qaPrjShortDescCount");
      if (c) c.textContent = e.target.value.length;
    });
    this.setupFeaturedUpload("qaPrjMediaUpload", "qaPrjFeaturedFile", () => this.prjFeaturedImage, (v) => {
      this.prjFeaturedImage = v;
    }, "projects");
    this.setupGalleryUpload("qaPrjGalleryUpload", "qaPrjGalleryFile", () => this.prjGalleryImages, (v) => {
      this.prjGalleryImages = v;
    }, "qaPrjGalleryGrid", "projects");
  }
  validateProjectBasic() {
    let ok = true;
    const title = $id("qaPrjTitle")?.value.trim();
    if (!title) {
      this.showErr("qaPrjTitle", true);
      ok = false;
    } else this.showErr("qaPrjTitle", false);
    const cat = $id("qaPrjCategory")?.value;
    if (!cat) {
      this.showErr("qaPrjCategory", true);
      ok = false;
    } else this.showErr("qaPrjCategory", false);
    const desc = $id("qaPrjShortDesc")?.value.trim();
    if (!desc) {
      this.showErr("qaPrjShortDesc", true);
      ok = false;
    } else this.showErr("qaPrjShortDesc", false);
    const full = $id("qaPrjFullDesc")?.textContent.trim();
    if (!full) {
      $id("qaPrjFullDescError")?.classList.add("visible");
      ok = false;
    } else $id("qaPrjFullDescError")?.classList.remove("visible");
    if (!ok) this.toast("Please fill in all required fields", "danger");
    return ok;
  }
  validateProjectTechnologies() {
    const tags = getChipValues($id("qaPrjTechChips"));
    const ok = tags.length > 0;
    if (!ok) {
      $id("qaPrjTechError")?.classList.add("visible");
      this.toast("Add at least one technology", "danger");
    } else {
      $id("qaPrjTechError")?.classList.remove("visible");
    }
    return ok;
  }
  validateProjectAll() {
    return this.validateProjectBasic() && this.validateProjectTechnologies();
  }
  async submitProject() {
    if (!this.validateProjectAll()) return false;
    const liveUrl = $id("qaPrjLiveUrl")?.value.trim() || "";
    const repoUrl = $id("qaPrjRepoUrl")?.value.trim() || "";
    if (liveUrl && !isValidUrl(liveUrl)) {
      this.toast("Live URL must include https://", "danger");
      return false;
    }
    if (repoUrl && !isValidUrl(repoUrl)) {
      this.toast("Repository URL must include https://", "danger");
      return false;
    }
    const category = $id("qaPrjCategory").value;
    const imageUrl = this.prjFeaturedImage?.url || $id("qaPrjImageUrl")?.value.trim() || "";
    const records = await storage.get("pa_projects", []);
    const newProject = {
      id: this.nextIds.project++,
      title: $id("qaPrjTitle").value.trim(),
      catKey: category,
      desc: $id("qaPrjShortDesc").value.trim(),
      fullDesc: $id("qaPrjFullDesc").textContent.trim(),
      tags: getChipValues($id("qaPrjTechChips")),
      featured: $id("qaPrjFeatured")?.value === "1",
      scene: pickSceneForCategory(category),
      liveUrl,
      repoUrl,
      status: $id("qaPrjStatus")?.value || "Completed",
      sortOrder: parseInt($id("qaPrjSortOrder")?.value, 10) || records.length + 1,
      imageUrl,
      bannerImgUrl: imageUrl,
      gallery: this.prjGalleryImages.slice(),
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    showStatusToast("Saving changes\u2026", "info", 12e4);
    await storage.set("pa_projects", records.concat(newProject));
    this.statusToast(`"${newProject.title}" added successfully!`, "success");
    this.notify(`New project "${newProject.title}" was added.`, "ri-add-circle-line");
    return true;
  }
  resetProjectForm() {
    ["qaPrjTitle", "qaPrjShortDesc", "qaPrjImageUrl", "qaPrjLiveUrl", "qaPrjRepoUrl", "qaPrjSortOrder"].forEach((id) => setVal(id, ""));
    setVal("qaPrjCategory", "");
    setHtml("qaPrjFullDesc", "");
    setHtml("qaPrjTechChips", "");
    setText("qaPrjShortDescCount", "0");
    setVal("qaPrjStatus", "Completed");
    setVal("qaPrjFeatured", "0");
    setHtml("qaPrjGalleryGrid", "");
    $id("qaPrjGalleryPreview")?.classList.remove("has-images");
    setHtml("qaPrjFeaturedPreviewWrap", "");
    setDisplay("qaPrjMediaUpload", "");
    this.prjFeaturedImage = null;
    this.prjGalleryImages = [];
    this.wizardStep.project = "basic";
    activateWizardStep("project", "basic");
    this.updateWizardUi("project");
  }
  // ─── Testimonial ──────────────────────────────────────────────────
  wireTestimonialForm() {
    this.setupAvatarDropzone("qaTestiAvatarDropzone", "qaTestiAvatarFileInput", "qaTestiAvatarPreviewWrap", "qaTestiAvatarPreviewImg", "qaTestiAvatarRemoveBtn", () => this.testiImage, (v) => {
      this.testiImage = v;
    }, "testimonials");
    this.on($id("qaTestiQuote"), "input", (e) => {
      const c = $id("qaTestiQuoteCount");
      if (c) c.textContent = e.target.value.length;
    });
  }
  async submitTestimonial() {
    const name = $id("qaTestiName")?.value.trim();
    const quote = $id("qaTestiQuote")?.value.trim();
    let ok = true;
    if (!name) {
      this.showErr("qaTestiName", true);
      ok = false;
    } else this.showErr("qaTestiName", false);
    if (!quote) {
      this.showErr("qaTestiQuote", true);
      ok = false;
    } else this.showErr("qaTestiQuote", false);
    if (!ok) {
      this.toast("Please fill in all required fields", "danger");
      return false;
    }
    const records = await storage.get("pa_testimonials", []);
    const newItem = {
      id: this.nextIds.testimonial++,
      name,
      quote,
      role: $id("qaTestiRole")?.value.trim() || "",
      company: $id("qaTestiCompany")?.value.trim() || "",
      rating: parseInt($id("qaTestiRating")?.value, 10) || 5,
      imageUrl: this.testiImage || "",
      imageAlt: $id("qaTestiAlt")?.value.trim() || "",
      featured: $id("qaTestiFeatured")?.value === "1",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    showStatusToast("Saving changes\u2026", "info", 12e4);
    await storage.set("pa_testimonials", records.concat(newItem));
    this.statusToast(`Testimonial from "${name}" added!`, "success");
    this.notify(`New testimonial from "${name}" was added.`, "ri-chat-quote-line");
    return true;
  }
  resetTestimonialForm() {
    ["qaTestiName", "qaTestiRole", "qaTestiCompany", "qaTestiQuote", "qaTestiAlt"].forEach((id) => setVal(id, ""));
    setVal("qaTestiRating", "5");
    setVal("qaTestiFeatured", "0");
    setText("qaTestiQuoteCount", "0");
    this.testiImage = null;
    setDisplay("qaTestiAvatarPreviewWrap", "none");
    setDisplay("qaTestiAvatarDropzone", "");
  }
  // ─── Experience ───────────────────────────────────────────────────
  wireExperienceForm() {
    this.on($id("qaExpCurrent"), "change", (e) => {
      const row = $id("qaExpEndDateRow");
      if (row) row.style.display = e.target.value === "1" ? "none" : "block";
    });
  }
  validateExpDetails() {
    let ok = true;
    if (!$id("qaExpTitle")?.value.trim()) {
      this.showErr("qaExpTitle", true);
      ok = false;
    } else this.showErr("qaExpTitle", false);
    if (!$id("qaExpCompany")?.value.trim()) {
      this.showErr("qaExpCompany", true);
      ok = false;
    } else this.showErr("qaExpCompany", false);
    if (!$id("qaExpType")?.value) {
      this.showErr("qaExpType", true);
      ok = false;
    } else this.showErr("qaExpType", false);
    if (!ok) this.toast("Please fill in all required fields", "danger");
    return ok;
  }
  async submitExperience() {
    if (!this.validateExpDetails()) return false;
    if (!$id("qaExpStartDate")?.value) {
      this.showErr("qaExpStartDate", true);
      this.toast("Start date is required", "danger");
      return false;
    }
    const current = $id("qaExpCurrent")?.value === "1";
    const records = await storage.get("pa_experience", []);
    const newExp = {
      id: this.nextIds.experience++,
      title: $id("qaExpTitle").value.trim(),
      company: $id("qaExpCompany").value.trim(),
      location: $id("qaExpLocation")?.value.trim() || "",
      type: $id("qaExpType").value,
      startDate: $id("qaExpStartDate").value,
      endDate: current ? "" : $id("qaExpEndDate")?.value || "",
      current,
      desc: $id("qaExpDesc")?.value.trim() || "",
      sortOrder: parseSortInput($id("qaExpSort")?.value || "", records.length + 1)
    };
    showStatusToast("Saving changes\u2026", "info", 12e4);
    await storage.set("pa_experience", records.concat(newExp));
    this.statusToast(`"${newExp.title}" added successfully!`, "success");
    this.notify(`New experience "${newExp.title}" was added.`, "ri-briefcase-line");
    return true;
  }
  resetExperienceForm() {
    ["qaExpTitle", "qaExpCompany", "qaExpLocation", "qaExpDesc", "qaExpStartDate", "qaExpEndDate", "qaExpSort"].forEach((id) => setVal(id, ""));
    setVal("qaExpType", "");
    setVal("qaExpCurrent", "0");
    setDisplay("qaExpEndDateRow", "block");
    this.wizardStep.experience = "details";
    activateWizardStep("experience", "details");
    this.updateWizardUi("experience");
  }
  // ─── Blog ─────────────────────────────────────────────────────────
  wireBlogForm() {
    this.on($id("qaBlogTitle"), "input", (e) => {
      if (!this.blogSlugTouched) $id("qaBlogSlug").value = slugify(e.target.value);
    });
    this.on($id("qaBlogSlug"), "input", () => {
      this.blogSlugTouched = true;
    });
    this.on($id("qaBlogExcerpt"), "input", (e) => {
      const c = $id("qaBlogExcerptCount");
      if (c) c.textContent = e.target.value.length;
    });
    this.on($id("qaBlogTagInput"), "keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        addChip($id("qaBlogTagChips"), e.target.value);
        e.target.value = "";
      }
    });
    this.on($id("qaBlogTagAddBtn"), "click", () => {
      const input = $id("qaBlogTagInput");
      addChip($id("qaBlogTagChips"), input.value);
      input.value = "";
    });
    this.setupAvatarDropzone("qaBlogImageDropzone", "qaBlogImageFileInput", "qaBlogImagePreviewWrap", "qaBlogImagePreviewImg", "qaBlogImageRemoveBtn", () => this.blogImage, (v) => {
      this.blogImage = v;
    }, "blog");
  }
  validateBlogContent() {
    let ok = true;
    if (!$id("qaBlogTitle")?.value.trim()) {
      this.showErr("qaBlogTitle", true);
      ok = false;
    } else this.showErr("qaBlogTitle", false);
    const slug = $id("qaBlogSlug")?.value.trim();
    if (!slug || !isValidSlug(slug)) {
      this.showErr("qaBlogSlug", true);
      ok = false;
    } else this.showErr("qaBlogSlug", false);
    if (!$id("qaBlogCategory")?.value) {
      this.showErr("qaBlogCategory", true);
      ok = false;
    } else this.showErr("qaBlogCategory", false);
    if (!$id("qaBlogExcerpt")?.value.trim()) {
      this.showErr("qaBlogExcerpt", true);
      ok = false;
    } else this.showErr("qaBlogExcerpt", false);
    const content = $id("qaBlogContent")?.textContent.trim();
    if (!content) {
      $id("qaBlogContentError")?.classList.add("visible");
      ok = false;
    } else $id("qaBlogContentError")?.classList.remove("visible");
    if (!ok) this.toast("Please fill in all required fields", "danger");
    return ok;
  }
  async submitBlog() {
    if (!this.validateBlogContent()) return false;
    const slug = $id("qaBlogSlug").value.trim();
    const records = await storage.get("pa_blog_posts", []);
    if (records.some((p) => p.slug === slug)) {
      this.toast(`Slug "${slug}" is already in use`, "danger");
      return false;
    }
    const newPost = {
      id: this.nextIds.blog++,
      title: $id("qaBlogTitle").value.trim(),
      slug,
      category: $id("qaBlogCategory").value,
      excerpt: $id("qaBlogExcerpt").value.trim(),
      content: $id("qaBlogContent").textContent.trim(),
      tags: getChipValues($id("qaBlogTagChips")),
      status: $id("qaBlogStatus")?.value || "Draft",
      featured: $id("qaBlogFeatured")?.value === "1",
      imageUrl: this.blogImage || $id("qaBlogImageUrl")?.value.trim() || "",
      imageAlt: $id("qaBlogImageAlt")?.value.trim() || "",
      publishedAt: $id("qaBlogPublishedDate")?.value || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
      sortOrder: parseInt($id("qaBlogSortOrder")?.value, 10) || records.length + 1,
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    showStatusToast("Saving changes\u2026", "info", 12e4);
    await storage.set("pa_blog_posts", records.concat(newPost));
    this.statusToast(`"${newPost.title}" added successfully!`, "success");
    this.notify(`New blog post "${newPost.title}" was added.`, "ri-article-line");
    return true;
  }
  resetBlogForm() {
    ["qaBlogTitle", "qaBlogSlug", "qaBlogExcerpt", "qaBlogImageUrl", "qaBlogImageAlt", "qaBlogSortOrder"].forEach((id) => setVal(id, ""));
    setVal("qaBlogCategory", "");
    setHtml("qaBlogContent", "");
    setHtml("qaBlogTagChips", "");
    setVal("qaBlogStatus", "Draft");
    setVal("qaBlogFeatured", "0");
    setVal("qaBlogPublishedDate", (/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
    setText("qaBlogExcerptCount", "0");
    this.blogImage = null;
    this.blogSlugTouched = false;
    setDisplay("qaBlogImagePreviewWrap", "none");
    setDisplay("qaBlogImageDropzone", "");
    this.wizardStep.blog = "content";
    activateWizardStep("blog", "content");
    this.updateWizardUi("blog");
  }
  // ─── Shared upload helpers ──────────────────────────────────────────
  setupFeaturedUpload(boxId, inputId, getImg, setImg, folder = "projects") {
    const box = $id(boxId);
    const input = $id(inputId);
    if (!box || !input) return;
    const previewWrapId = boxId.replace("MediaUpload", "FeaturedPreviewWrap");
    const accept = async (file) => {
      if (!handleFileValidation(file)) return;
      const wrap = $id(previewWrapId);
      try {
        const uploaded = await uploadCmsFileWithPreview(file, {
          folder,
          optimize: { maxWidth: 1920, maxHeight: 1080, quality: 0.88 },
          onPreview: (previewUrl) => {
            setImg({ url: previewUrl, name: file.name });
            if (wrap) {
              wrap.innerHTML = `<div class="pa-media-preview"><img src="${previewUrl}" alt="${file.name}" /><button type="button" class="pa-media-preview-remove" aria-label="Remove"><i class="ri-close-line"></i></button></div>`;
            }
          }
        });
        setImg({ url: uploaded.url, name: file.name });
        if (wrap) {
          wrap.innerHTML = `<div class="pa-media-preview"><img src="${uploaded.url}" alt="${file.name}" /><button type="button" class="pa-media-preview-remove" aria-label="Remove"><i class="ri-close-line"></i></button></div>`;
          wrap.querySelector(".pa-media-preview-remove")?.addEventListener("click", () => {
            setImg(null);
            wrap.innerHTML = "";
            box.style.display = "";
          });
        }
        box.style.display = "none";
      } catch {
        this.toast("Could not upload image", "danger");
      }
    };
    this.on(box, "click", () => input.click());
    this.on(input, "change", async () => {
      const f = input.files?.[0];
      input.value = "";
      if (f) await accept(f);
    });
    ["dragenter", "dragover"].forEach((evt) => this.on(box, evt, (e) => {
      e.preventDefault();
      box.classList.add("dragover");
    }));
    ["dragleave", "drop"].forEach((evt) => this.on(box, evt, (e) => {
      e.preventDefault();
      box.classList.remove("dragover");
    }));
    this.on(box, "drop", async (e) => {
      const f = e.dataTransfer?.files?.[0];
      if (f) await accept(f);
    });
  }
  setupGalleryUpload(boxId, inputId, getArr, setArr, gridId, folder = "projects") {
    const box = $id(boxId);
    const input = $id(inputId);
    if (!box || !input) return;
    const render = () => {
      const grid = $id(gridId);
      const images = getArr();
      if (!grid) return;
      const preview = grid.closest(".pa-qa-gallery-preview");
      preview?.classList.toggle("has-images", images.length > 0);
      grid.innerHTML = images.map((img, i) => `<div class="pa-gallery-thumb"><img src="${img.url}" alt="${img.name || ""}" /><div class="pa-gallery-thumb-remove" data-i="${i}" role="button"><i class="ri-close-line"></i></div></div>`).join("");
      grid.querySelectorAll(".pa-gallery-thumb-remove").forEach((btn) => {
        btn.addEventListener("click", () => {
          const arr = getArr().slice();
          arr.splice(parseInt(btn.dataset.i, 10), 1);
          setArr(arr);
          render();
        });
      });
    };
    this.on(box, "click", () => input.click());
    this.on(input, "change", async () => {
      const files = Array.from(input.files || []);
      const arr = getArr().slice();
      for (const file of files) {
        if (!handleFileValidation(file)) continue;
        try {
          const uploaded = await uploadCmsFileWithPreview(file, {
            folder,
            optimize: { maxWidth: 1920, maxHeight: 1080, quality: 0.88 }
          });
          arr.push({ url: uploaded.url, name: file.name });
        } catch {
        }
      }
      setArr(arr);
      render();
      input.value = "";
    });
  }
  setupAvatarDropzone(dzId, inputId, wrapId, imgId, removeId, getData, setData, folder = "avatars") {
    const dz = $id(dzId);
    const input = $id(inputId);
    const remove = $id(removeId);
    if (!dz || !input) return;
    const setPreview = (dataUrl) => {
      const wrap = $id(wrapId);
      const img = $id(imgId);
      if (dataUrl) {
        if (img) img.src = dataUrl;
        if (wrap) wrap.style.display = "block";
        dz.style.display = "none";
      } else {
        if (wrap) wrap.style.display = "none";
        dz.style.display = "";
      }
    };
    this.on(dz, "click", () => input.click());
    this.on(input, "change", async () => {
      const file = input.files?.[0];
      input.value = "";
      if (!file || !handleFileValidation(file)) return;
      try {
        const uploaded = await uploadCmsFileWithPreview(file, {
          folder,
          optimize: { maxWidth: 800, maxHeight: 800, quality: 0.85 },
          onPreview: (previewUrl) => {
            setData(previewUrl);
            setPreview(previewUrl);
          }
        });
        setData(uploaded.url);
        setPreview(uploaded.url);
      } catch {
        this.toast("Could not upload image", "danger");
      }
    });
    ["dragenter", "dragover"].forEach((evt) => this.on(dz, evt, (e) => {
      e.preventDefault();
      dz.classList.add("dragover");
    }));
    ["dragleave", "drop"].forEach((evt) => this.on(dz, evt, (e) => {
      e.preventDefault();
      dz.classList.remove("dragover");
    }));
    this.on(dz, "drop", async (e) => {
      const file = e.dataTransfer?.files?.[0];
      if (!file || !handleFileValidation(file)) return;
      try {
        const uploaded = await uploadCmsFileWithPreview(file, {
          folder,
          optimize: { maxWidth: 800, maxHeight: 800, quality: 0.85 },
          onPreview: (previewUrl) => {
            setData(previewUrl);
            setPreview(previewUrl);
          }
        });
        setData(uploaded.url);
        setPreview(uploaded.url);
      } catch {
        this.toast("Could not upload image", "danger");
      }
    });
    if (remove) this.on(remove, "click", (e) => {
      e.stopPropagation();
      setData(null);
      setPreview(null);
    });
  }
  resetForm(tab) {
    const resets = {
      project: () => this.resetProjectForm(),
      testimonial: () => this.resetTestimonialForm(),
      experience: () => this.resetExperienceForm(),
      blog: () => this.resetBlogForm()
    };
    resets[tab]?.();
    this.updateFooter();
  }
}
export {
  QuickAddModule
};
