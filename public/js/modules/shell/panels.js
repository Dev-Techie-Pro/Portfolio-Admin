import { $id } from "../../utils/dom.js";
const registeredPanelIds = /* @__PURE__ */ new Set();
function registerPanel(id) {
  registeredPanelIds.add(id);
}
function anyPanelOpen() {
  return Array.from(registeredPanelIds).some((id) => $id(id)?.classList.contains("visible"));
}
function closePanels() {
  $id("paPanelOverlay")?.classList.remove("visible");
  registeredPanelIds.forEach((id) => $id(id)?.classList.remove("visible"));
  $id("paCustomToggle")?.classList.remove("active");
  document.querySelector(".pa-custom-toggle")?.classList.remove("active");
  document.body.style.overflow = "";
}
function openPanel(panelId, hidePanelIds = []) {
  hidePanelIds.forEach((id) => $id(id)?.classList.remove("visible"));
  $id("paPanelOverlay")?.classList.add("visible");
  $id(panelId)?.classList.add("visible");
}
function setButtonLoading(btnId, loading) {
  const btn = $id(btnId);
  if (!btn) return;
  btn.classList.toggle("loading", loading);
  btn.disabled = loading;
}
function activateTab(panel, tab) {
  document.querySelectorAll(`.pa-panel-tab[data-panel="${panel}"]`).forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  document.querySelectorAll(`.pa-qa-top-tab[data-panel="${panel}"], .pa-qa-bottom-tab[data-panel="${panel}"]`).forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  document.querySelectorAll(`.pa-tab-panel[data-panel="${panel}"]`).forEach((pane) => {
    pane.classList.toggle("active", pane.dataset.content === tab);
  });
  const panelId = document.querySelector(`.pa-panel[data-panel="${panel}"]`)?.id || document.querySelector(`#${panel}`)?.id || panel;
  const scrollRoot = document.querySelector(`#${panelId} .pa-qa-content`) || document.querySelector(`#${panelId} .pa-panel-body`);
  if (scrollRoot) scrollRoot.scrollTop = 0;
}
function activateWizardStep(entity, step) {
  const root = document.querySelector(`.pa-qa-wizard[data-qa-entity="${entity}"]`);
  if (!root) return;
  root.querySelectorAll("[data-wizard-step]").forEach((el) => {
    const isStep = el.dataset.wizardStep === step;
    if (el.classList.contains("pa-qa-step")) el.classList.toggle("active", isStep);
    if (el.classList.contains("pa-qa-step-panel")) el.classList.toggle("active", isStep);
  });
  const body = root.querySelector(".pa-qa-wizard-body");
  if (body) body.scrollTop = 0;
}
export {
  activateTab,
  activateWizardStep,
  anyPanelOpen,
  closePanels,
  openPanel,
  registerPanel,
  setButtonLoading
};
