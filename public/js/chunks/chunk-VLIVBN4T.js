import {
  isValidUrl
} from "./chunk-SCZE3YCL.js";
import {
  escapeHtml
} from "./chunk-R5CPOL4O.js";

// client/utils/url-prompt.ts
var overlay = null;
var inputEl = null;
var errorEl = null;
var removeBtn = null;
var pendingResolve = null;
var hadExistingLink = false;
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

// client/utils/rte.ts
function saveSelection(body) {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return null;
  const range = sel.getRangeAt(0);
  if (!body.contains(range.commonAncestorContainer)) return null;
  return range.cloneRange();
}
function restoreSelection(body, savedRange) {
  if (!savedRange) return false;
  body.focus();
  const sel = window.getSelection();
  if (!sel) return false;
  sel.removeAllRanges();
  sel.addRange(savedRange);
  return true;
}
function getSelectedLinkUrl(body) {
  const sel = window.getSelection();
  if (!sel?.rangeCount) return "";
  let node = sel.anchorNode;
  if (node?.nodeType === 3) node = node.parentElement;
  const anchor = node?.closest?.("a");
  if (anchor && body.contains(anchor)) {
    return anchor.getAttribute("href") || anchor.href || "";
  }
  return "";
}
function applyLink(body, url, savedRange) {
  restoreSelection(body, savedRange);
  const sel = window.getSelection();
  if (!url) {
    document.execCommand("unlink", false, null);
    return;
  }
  const range = sel?.rangeCount ? sel.getRangeAt(0) : savedRange;
  let node = range?.commonAncestorContainer;
  if (node?.nodeType === 3) node = node.parentElement;
  const existingAnchor = node?.closest?.("a");
  if (existingAnchor && body.contains(existingAnchor)) {
    existingAnchor.href = url;
    existingAnchor.target = "_blank";
    existingAnchor.rel = "noopener noreferrer";
    return;
  }
  const hasTextSelection = range && !range.collapsed;
  if (hasTextSelection) {
    document.execCommand("createLink", false, url);
    return;
  }
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.textContent = url;
  anchor.target = "_blank";
  anchor.rel = "noopener noreferrer";
  if (range) {
    range.deleteContents();
    range.insertNode(anchor);
    const after = document.createRange();
    after.setStartAfter(anchor);
    after.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(after);
  } else {
    body.appendChild(document.createTextNode(" "));
    body.appendChild(anchor);
    body.appendChild(document.createTextNode(" "));
  }
}
function setupRte(wrapId, bodyId) {
  const wrap = document.getElementById(wrapId);
  const body = document.getElementById(bodyId);
  if (!wrap || !body) return;
  wrap.querySelectorAll(".pa-rte-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      body.focus();
      const cmd = btn.dataset.cmd;
      if (cmd === "createLink") {
        const savedRange = saveSelection(body);
        const existing = getSelectedLinkUrl(body);
        void promptUrl({
          defaultValue: existing,
          title: existing ? "Edit link" : "Insert link",
          subtitle: existing ? "Update the URL or remove the link from the selected text." : "Add a web address for the selected text.",
          confirmLabel: existing ? "Save link" : "Insert link"
        }).then((url) => {
          if (url === null) return;
          applyLink(body, url, savedRange);
          updateRteButtonStates(wrap);
        });
        return;
      } else if (cmd === "formatBlock") {
        document.execCommand("formatBlock", false, btn.dataset.value || "blockquote");
      } else {
        document.execCommand(cmd, false, null);
      }
      updateRteButtonStates(wrap);
    });
  });
  body.addEventListener("keyup", () => updateRteButtonStates(wrap));
  body.addEventListener("mouseup", () => updateRteButtonStates(wrap));
  body.addEventListener("paste", (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, text);
  });
}
function updateRteButtonStates(wrap) {
  const map = {
    bold: "bold",
    italic: "italic",
    underline: "underline",
    insertUnorderedList: "insertUnorderedList",
    insertOrderedList: "insertOrderedList"
  };
  wrap.querySelectorAll(".pa-rte-btn[data-cmd]").forEach((btn) => {
    const cmd = map[btn.dataset.cmd];
    if (!cmd) return;
    try {
      btn.classList.toggle("active", document.queryCommandState(cmd));
    } catch {
    }
  });
}

// client/utils/chips.ts
function addChip(chipContainer, text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const existing = Array.from(chipContainer.children).map((c) => c.dataset.value?.toLowerCase());
  if (existing.includes(trimmed.toLowerCase())) return;
  const span = document.createElement("span");
  span.className = "pa-chip";
  span.dataset.value = trimmed;
  span.innerHTML = `<span>${escapeHtml(trimmed)}</span>`;
  const removeBtn2 = document.createElement("button");
  removeBtn2.type = "button";
  removeBtn2.className = "pa-chip-remove";
  removeBtn2.setAttribute("aria-label", `Remove ${trimmed}`);
  removeBtn2.innerHTML = "&times;";
  removeBtn2.addEventListener("click", () => span.remove());
  span.appendChild(removeBtn2);
  chipContainer.appendChild(span);
}
function getChipValues(container) {
  return Array.from(container.children).map((c) => c.dataset.value);
}
function populateChips(container, tags) {
  container.innerHTML = "";
  tags.forEach((t) => addChip(container, t));
}

export {
  setupRte,
  addChip,
  getChipValues,
  populateChips
};
