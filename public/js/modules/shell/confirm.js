import { $id } from "../../utils/dom.js";
import { eventBus } from "../../core/EventBus.js";
import { closePanels } from "./panels.js";
let pendingId = null;
let pendingType = null;
let pendingBulkConfirm = null;
let pendingLogoutConfirm = null;
let confirmDefaultsBackup = null;
let dialogBound = false;
function getConfirmIconEl() {
  return document.querySelector("#paConfirmOverlay .pa-confirm-icon i");
}
function getConfirmIconWrap() {
  return document.querySelector("#paConfirmOverlay .pa-confirm-icon");
}
function captureConfirmDefaults() {
  if (confirmDefaultsBackup) return;
  const titleEl = $id("paConfirmTitle");
  const okEl = $id("paConfirmOk");
  const iconEl = getConfirmIconEl();
  const iconWrap = getConfirmIconWrap();
  confirmDefaultsBackup = {
    title: titleEl?.textContent || "",
    okText: okEl?.textContent || "",
    okDanger: okEl?.classList.contains("--pa-red"),
    iconClass: iconEl?.className || "ri-delete-bin-line",
    iconWrapClass: iconWrap?.className || "pa-confirm-icon"
  };
}
function restoreConfirmDefaults() {
  if (!confirmDefaultsBackup) return;
  const titleEl = $id("paConfirmTitle");
  const okEl = $id("paConfirmOk");
  const iconEl = getConfirmIconEl();
  const iconWrap = getConfirmIconWrap();
  if (titleEl) titleEl.textContent = confirmDefaultsBackup.title;
  if (okEl) {
    okEl.textContent = confirmDefaultsBackup.okText;
    okEl.classList.toggle("--pa-red", confirmDefaultsBackup.okDanger);
  }
  if (iconEl) iconEl.className = confirmDefaultsBackup.iconClass;
  if (iconWrap) iconWrap.className = confirmDefaultsBackup.iconWrapClass;
  confirmDefaultsBackup = null;
}
function applyConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  iconClass = "ri-delete-bin-line",
  danger = true,
  iconTone = "danger"
}) {
  captureConfirmDefaults();
  const titleEl = $id("paConfirmTitle");
  const textEl = $id("paConfirmText");
  const okEl = $id("paConfirmOk");
  const iconEl = getConfirmIconEl();
  const iconWrap = getConfirmIconWrap();
  if (titleEl && title) titleEl.textContent = title;
  if (textEl && message) textEl.innerHTML = message;
  if (okEl) {
    okEl.textContent = confirmLabel;
    okEl.classList.toggle("--pa-red", danger);
  }
  if (iconEl) iconEl.className = iconClass;
  if (iconWrap) {
    iconWrap.className = "pa-confirm-icon";
    if (iconTone === "warning") iconWrap.classList.add("pa-confirm-icon--warning");
  }
}
function requestDelete(id, type, name, extraInfo = "") {
  pendingLogoutConfirm = null;
  restoreConfirmDefaults();
  pendingBulkConfirm = null;
  pendingId = id;
  pendingType = type;
  let text = `This will permanently remove <strong>${name}</strong>.`;
  if (extraInfo) text += ` ${extraInfo}`;
  text += " This action cannot be undone.";
  const textEl = $id("paConfirmText");
  if (textEl) textEl.innerHTML = text;
  $id("paConfirmOverlay")?.classList.add("visible");
}
function requestBulkAction({
  title,
  message,
  onConfirm,
  confirmLabel = "Delete",
  iconClass = "ri-delete-bin-line",
  danger = true,
  iconTone = "danger"
}) {
  pendingLogoutConfirm = null;
  restoreConfirmDefaults();
  pendingId = null;
  pendingType = null;
  pendingBulkConfirm = onConfirm;
  applyConfirmDialog({ title, message, confirmLabel, iconClass, danger, iconTone });
  $id("paConfirmOverlay")?.classList.add("visible");
}
function requestConfirm(opts) {
  return requestBulkAction(opts);
}
function restoreBulkTitle() {
  restoreConfirmDefaults();
}
function closeConfirm() {
  $id("paConfirmOverlay")?.classList.remove("visible");
  pendingId = null;
  pendingType = null;
  if (pendingBulkConfirm) {
    pendingBulkConfirm = null;
    restoreConfirmDefaults();
  }
  if (pendingLogoutConfirm) {
    pendingLogoutConfirm = null;
    restoreConfirmDefaults();
  }
}
function requestLogout(onConfirm) {
  pendingLogoutConfirm = onConfirm;
  pendingId = null;
  pendingType = null;
  pendingBulkConfirm = null;
  restoreConfirmDefaults();
  applyConfirmDialog({
    title: "Logout?",
    message: "Are you sure you want to logout? You will need to sign in again to access the admin panel.",
    confirmLabel: "Logout",
    iconClass: "ri-logout-circle-line",
    danger: false,
    iconTone: "warning"
  });
  $id("paConfirmOverlay")?.classList.add("visible");
}
function restoreLogoutCopy() {
  restoreConfirmDefaults();
}
function hitConfirmControl(target, id) {
  if (!target) return false;
  if (target.id === id) return true;
  return typeof target.closest === "function" && !!target.closest(`#${id}`);
}
async function performDelete() {
  if (pendingLogoutConfirm) {
    const cb = pendingLogoutConfirm;
    pendingLogoutConfirm = null;
    $id("paConfirmOverlay")?.classList.remove("visible");
    restoreConfirmDefaults();
    await Promise.resolve(cb());
    return;
  }
  if (pendingBulkConfirm) {
    const cb = pendingBulkConfirm;
    pendingBulkConfirm = null;
    $id("paConfirmOverlay")?.classList.remove("visible");
    restoreConfirmDefaults();
    await Promise.resolve(cb());
    return;
  }
  if (pendingId == null || pendingType == null) return;
  const { id, type } = { id: pendingId, type: pendingType };
  closeConfirm();
  closePanels();
  eventBus.emit("confirm:confirmed", { id, type });
}
function onConfirmDocumentClick(e) {
  const overlay = document.getElementById("paConfirmOverlay");
  if (!overlay?.classList.contains("visible")) return;
  if (hitConfirmControl(e.target, "paConfirmCancel")) {
    e.preventDefault();
    closeConfirm();
    return;
  }
  if (hitConfirmControl(e.target, "paConfirmOk")) {
    e.preventDefault();
    void performDelete();
    return;
  }
  if (e.target.id === "paConfirmOverlay") {
    closeConfirm();
  }
}
function initConfirmDialog() {
  if (dialogBound) return;
  dialogBound = true;
  document.addEventListener("click", onConfirmDocumentClick);
}
function isConfirmOpen() {
  return !!document.getElementById("paConfirmOverlay")?.classList.contains("visible");
}
export {
  closeConfirm,
  initConfirmDialog,
  isConfirmOpen,
  requestBulkAction,
  requestConfirm,
  requestDelete,
  requestLogout
};
