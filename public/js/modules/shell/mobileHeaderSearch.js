const MOBILE_SEARCH_MAX = 899;
let abortController = null;
let headerTop = null;
function getSearchWrap() {
  return document.querySelector(".pa-header-top-left .pa-search, .pa-header-right .pa-search");
}
function getSearchInput() {
  return getSearchWrap()?.querySelector("input");
}
function isMobileSearchViewport() {
  return window.innerWidth <= MOBILE_SEARCH_MAX;
}
function isMobileHeaderSearchOpen() {
  return headerTop?.classList.contains("pa-header-top--search-open") ?? false;
}
function closeMobileHeaderSearch() {
  if (!headerTop) return;
  headerTop.classList.remove("pa-header-top--search-open");
  document.documentElement.classList.remove("pa-mobile-search-active");
  const toggle = document.getElementById("paMobileSearchToggle");
  toggle?.setAttribute("aria-expanded", "false");
}
function openMobileHeaderSearch() {
  const wrap = getSearchWrap();
  if (!wrap || !headerTop || !isMobileSearchViewport()) return false;
  document.getElementById("paNotifWrap")?.classList.remove("open");
  headerTop.classList.add("pa-header-top--search-open");
  document.documentElement.classList.add("pa-mobile-search-active");
  const toggle = document.getElementById("paMobileSearchToggle");
  toggle?.setAttribute("aria-expanded", "true");
  requestAnimationFrame(() => getSearchInput()?.focus());
  return true;
}
function initMobileHeaderSearch() {
  abortController?.abort();
  abortController = new AbortController();
  const { signal } = abortController;
  headerTop = document.querySelector(".pa-header-top");
  const searchWrap = getSearchWrap();
  const headerTopRight = document.querySelector(".pa-header-top-right");
  if (!headerTop || !searchWrap || !headerTopRight) {
    headerTop = null;
    return;
  }
  closeMobileHeaderSearch();
  let toggle = document.getElementById("paMobileSearchToggle");
  if (!toggle) {
    toggle = document.createElement("button");
    toggle.type = "button";
    toggle.id = "paMobileSearchToggle";
    toggle.className = "pa-mobile-search-toggle";
    toggle.setAttribute("aria-label", "Open search");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", searchWrap.id || "paSearchWrap");
    toggle.innerHTML = '<i class="ri-search-line" aria-hidden="true"></i>';
    headerTopRight.insertBefore(toggle, headerTopRight.firstChild);
  }
  let dismiss = searchWrap.querySelector(".pa-mobile-search-dismiss");
  if (!dismiss) {
    dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "pa-mobile-search-dismiss";
    dismiss.setAttribute("aria-label", "Close search");
    dismiss.innerHTML = '<i class="ri-close-line" aria-hidden="true"></i>';
    searchWrap.appendChild(dismiss);
  }
  toggle.addEventListener("click", () => {
    if (isMobileHeaderSearchOpen()) closeMobileHeaderSearch();
    else openMobileHeaderSearch();
  }, { signal });
  dismiss.addEventListener("click", (e) => {
    e.preventDefault();
    closeMobileHeaderSearch();
  }, { signal });
  window.addEventListener("resize", () => {
    if (!isMobileSearchViewport()) closeMobileHeaderSearch();
  }, { signal });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape" || !isMobileHeaderSearchOpen()) return;
    e.preventDefault();
    e.stopPropagation();
    closeMobileHeaderSearch();
  }, { signal, capture: true });
}
export {
  closeMobileHeaderSearch,
  initMobileHeaderSearch,
  isMobileHeaderSearchOpen,
  openMobileHeaderSearch
};
