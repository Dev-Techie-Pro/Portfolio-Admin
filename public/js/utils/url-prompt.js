import { isValidUrl } from "./strings.js";
let overlay = null;
let inputEl = null;
let errorEl = null;
let removeBtn = null;
let pendingResolve = null;
let hadExistingLink = false;
function normalizeUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  return `https://${value}`;
}
function ensureModal() {
  if (overlay) return;
  overlay = document.createElement("div");
  overlay.className = "pa-url-prompt-overlay";
  overlay.id = "paUrlPromptOverlay";
  overlay.innerHTML = `
    <div class="pa-url-prompt-box" role="dialog" aria-modal="true" aria-labelledby="paUrlPromptTitle">
      <div class="pa-url-prompt-icon" aria-hidden="true"><i class="ri-link"></i></div>
      <div class="pa-url-prompt-title" id="paUrlPromptTitle">Insert link</div>
      <p class="pa-url-prompt-sub" id="paUrlPromptSub">Add a web address for the selected text.</p>
      <div class="pa-form-group pa-url-prompt-field">
        <label class="pa-form-label" for="paUrlPromptInput">URL</label>
        <input class="pa-form-input" type="url" id="paUrlPromptInput" placeholder="https://example.com" autocomplete="off" spellcheck="false" inputmode="url" />
        <div class="pa-form-error-msg" id="paUrlPromptError"><i class="ri-error-warning-line"></i> <span>Enter a valid URL starting with https://</span></div>
        <p class="pa-url-prompt-hint">Tip: you can paste a full link or type a domain \u2014 we will add https:// for you.</p>
      </div>
      <div class="pa-url-prompt-actions">
        <button type="button" class="pa-btn pa-btn-cancel" id="paUrlPromptCancel">Cancel</button>
        <button type="button" class="pa-btn pa-btn-danger pa-url-prompt-remove" id="paUrlPromptRemove" style="display:none;">Remove link</button>
        <button type="button" class="pa-btn pa-btn-primary" id="paUrlPromptOk">Insert link</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  inputEl = overlay.querySelector("#paUrlPromptInput");
  errorEl = overlay.querySelector("#paUrlPromptError");
  removeBtn = overlay.querySelector("#paUrlPromptRemove");
  overlay.querySelector("#paUrlPromptCancel").addEventListener("click", () => close(null));
  overlay.querySelector("#paUrlPromptOk").addEventListener("click", () => submit());
  removeBtn.addEventListener("click", () => close(""));
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) close(null);
  });
  inputEl.addEventListener("input", () => {
    inputEl.classList.remove("error");
    errorEl?.classList.remove("visible");
  });
  inputEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  });
  document.addEventListener("keydown", onDocumentKeydown);
}
function onDocumentKeydown(e) {
  if (!overlay?.classList.contains("visible")) return;
  if (e.key === "Escape") {
    e.preventDefault();
    close(null);
  }
}
function setError(message) {
  const span = errorEl?.querySelector("span");
  if (span && message) span.textContent = message;
  inputEl?.classList.add("error");
  errorEl?.classList.add("visible");
}
function submit() {
  const normalized = normalizeUrl(inputEl?.value);
  if (!normalized) {
    setError("URL is required");
    inputEl?.focus();
    return;
  }
  if (!isValidUrl(normalized)) {
    setError("Enter a valid URL starting with https://");
    inputEl?.focus();
    return;
  }
  close(normalized);
}
function close(result) {
  overlay?.classList.remove("visible");
  const resolve = pendingResolve;
  pendingResolve = null;
  resolve?.(result);
}
function promptUrl(options = {}) {
  ensureModal();
  if (pendingResolve) close(null);
  const {
    defaultValue = "",
    title = "Insert link",
    subtitle = "Add a web address for the selected text.",
    confirmLabel = "Insert link"
  } = options;
  hadExistingLink = !!defaultValue;
  const titleEl = overlay.querySelector("#paUrlPromptTitle");
  const subEl = overlay.querySelector("#paUrlPromptSub");
  const okEl = overlay.querySelector("#paUrlPromptOk");
  if (titleEl) titleEl.textContent = title;
  if (subEl) subEl.textContent = subtitle;
  if (okEl) okEl.textContent = confirmLabel;
  if (removeBtn) removeBtn.style.display = hadExistingLink ? "" : "none";
  inputEl.value = defaultValue || "https://";
  inputEl.classList.remove("error");
  errorEl?.classList.remove("visible");
  return new Promise((resolve) => {
    pendingResolve = resolve;
    overlay.classList.add("visible");
    requestAnimationFrame(() => {
      inputEl?.focus();
      inputEl?.select();
    });
  });
}
export {
  promptUrl
};
