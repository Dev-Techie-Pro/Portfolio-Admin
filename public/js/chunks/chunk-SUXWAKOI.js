import {
  getMediaKind
} from "./chunk-YFM5AGT7.js";
import {
  formatFileSize
} from "./chunk-3FVVIY3E.js";
import {
  $id,
  escapeHtml,
  storage
} from "./chunk-OGR5OR6D.js";

// client/utils/MediaPicker.ts
var OVERLAY_ID = "paMediaPickerOverlay";
var modalReady = false;
var overlay = null;
var grid = null;
var searchInput = null;
var folderSelect = null;
var countEl = null;
var loadingEl = null;
var errorEl = null;
var emptyEl = null;
var titleEl = null;
var onSelectCb = null;
var returnFocusEl = null;
var allItems = [];
var filteredItems = [];
var currentFolder = "all";
var currentMediaFilter = "images";
var FILE_KIND_ICONS = {
  image: "ri-image-line",
  video: "ri-play-circle-line",
  document: "ri-file-text-line",
  other: "ri-file-zip-line"
};
function setLoading(loading) {
  loadingEl?.classList.toggle("visible", loading);
}
function setError(message) {
  if (!errorEl) return;
  const text = $id("paMediaPickerErrorText");
  if (text) text.textContent = message;
  errorEl.hidden = !message;
  if (message) {
    if (grid) grid.innerHTML = "";
    if (emptyEl) emptyEl.hidden = true;
  }
}
function ensureModal() {
  if (modalReady) return;
  overlay = $id(OVERLAY_ID);
  if (!overlay) {
    throw new Error("Media picker modal markup is missing from the page.");
  }
  grid = $id("paMediaPickerGrid");
  searchInput = $id("paMediaPickerSearch");
  folderSelect = $id("paMediaPickerFolder");
  countEl = $id("paMediaPickerCount");
  loadingEl = $id("paMediaPickerLoading");
  errorEl = $id("paMediaPickerError");
  emptyEl = $id("paMediaPickerEmpty");
  titleEl = $id("paMediaPickerTitle");
  $id("paMediaPickerClose")?.addEventListener("click", close);
  $id("paMediaPickerCancel")?.addEventListener("click", close);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close();
  });
  $id("paMediaPickerModal")?.addEventListener("click", (e) => e.stopPropagation());
  searchInput?.addEventListener("input", () => renderGrid());
  folderSelect?.addEventListener("change", () => {
    currentFolder = folderSelect.value || "all";
    renderGrid();
  });
  document.addEventListener("keydown", onDocumentKeydown);
  modalReady = true;
}
function onDocumentKeydown(e) {
  if (!overlay?.classList.contains("visible")) return;
  if (e.key === "Escape") {
    e.preventDefault();
    close();
  }
}
function restoreFocus() {
  const target = returnFocusEl;
  returnFocusEl = null;
  if (target && typeof target.focus === "function" && document.contains(target)) {
    target.focus();
  }
}
function openModal() {
  if (!overlay) return;
  overlay.removeAttribute("inert");
  overlay.removeAttribute("aria-hidden");
  overlay.classList.add("visible");
}
function closeModal() {
  if (!overlay) return;
  overlay.classList.remove("visible");
  restoreFocus();
  requestAnimationFrame(() => {
    if (!overlay.classList.contains("visible")) {
      overlay.setAttribute("inert", "");
    }
  });
}
function filterItems() {
  const query = (searchInput?.value || "").trim().toLowerCase();
  return allItems.filter((item) => {
    const kind = getMediaKind(item);
    if (currentMediaFilter === "images" && kind !== "image") return false;
    if (currentFolder !== "all" && (item.folder || "general") !== currentFolder) return false;
    if (!query) return true;
    const haystack = `${item.name || ""} ${item.alt || ""}`.toLowerCase();
    return haystack.includes(query);
  });
}
function updateCount() {
  if (!countEl) return;
  const total = filteredItems.length;
  if (!allItems.length) {
    countEl.textContent = "";
    return;
  }
  const label = currentMediaFilter === "images" ? "image" : "file";
  countEl.textContent = `${total.toLocaleString()} ${label}${total === 1 ? "" : "s"} available`;
}
function selectItem(item) {
  onSelectCb?.({
    url: item.url,
    name: item.name || "Selected file",
    alt: item.alt || "",
    type: item.type || "",
    size: item.size || 0
  });
  close();
}
function renderThumb(item) {
  const kind = getMediaKind(item);
  if (kind === "image") {
    return `<img src="${escapeHtml(item.url)}" alt="" loading="lazy" />`;
  }
  const icon = FILE_KIND_ICONS[kind] || "ri-file-line";
  return `<span class="pa-media-picker-file-icon"><i class="${icon}" aria-hidden="true"></i></span>`;
}
function createMediaButton(item) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "pa-media-picker-item";
  btn.setAttribute("role", "option");
  btn.setAttribute("aria-label", item.name || "Media file");
  btn.innerHTML = `
    <span class="pa-media-picker-thumb">
      ${renderThumb(item)}
    </span>
    <span class="pa-media-picker-meta">
      <span class="pa-media-picker-name">${escapeHtml(item.name || "Untitled")}</span>
      <span class="pa-media-picker-size">${escapeHtml(formatFileSize(item.size, item.url))}</span>
    </span>`;
  btn.addEventListener("click", () => selectItem(item));
  return btn;
}
function renderGrid() {
  if (!grid) return;
  filteredItems = filterItems();
  grid.innerHTML = "";
  if (!filteredItems.length) {
    emptyEl.hidden = false;
    updateCount();
    return;
  }
  emptyEl.hidden = true;
  const frag = document.createDocumentFragment();
  filteredItems.forEach((item) => frag.appendChild(createMediaButton(item)));
  grid.appendChild(frag);
  updateCount();
}
async function loadMedia() {
  setLoading(true);
  setError("");
  try {
    const records = await storage.get("pa_media_library", []);
    allItems = Array.isArray(records) ? records : [];
    renderGrid();
  } catch {
    setError("Could not load media library. Check your connection and try again.");
    if (countEl) countEl.textContent = "";
  } finally {
    setLoading(false);
  }
}
function close() {
  if (!overlay) return;
  closeModal();
  onSelectCb = null;
}
function open({
  mode = "featured",
  folder = "projects",
  mediaFilter = "images",
  onSelect,
  returnFocus
} = {}) {
  ensureModal();
  onSelectCb = onSelect;
  returnFocusEl = returnFocus || document.activeElement;
  currentFolder = folder || "all";
  currentMediaFilter = mediaFilter;
  if (titleEl) {
    if (mode === "attachment") titleEl.textContent = "Pick attachment from Media Library";
    else if (mode === "gallery") titleEl.textContent = "Pick gallery image";
    else titleEl.textContent = "Pick featured image";
  }
  if (searchInput) searchInput.value = "";
  if (folderSelect) folderSelect.value = currentFolder;
  openModal();
  setTimeout(() => searchInput?.focus(), 120);
  void loadMedia();
}

export {
  open
};
