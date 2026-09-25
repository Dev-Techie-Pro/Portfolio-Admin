(function() {
  const MARKUP = `
      <div class="pa-body-loader__veil" aria-hidden="true"></div>
      <div class="pa-body-loader__panel">
        <div class="pa-body-loader__orbit" aria-hidden="true">
          <span class="pa-body-loader__ring"></span>
          <span class="pa-body-loader__ring pa-body-loader__ring--delay"></span>
          <span class="pa-body-loader__core"><i class="ri-database-2-line"></i></span>
        </div>
        <p class="pa-body-loader__label">Loading your data\u2026</p>
        <div class="pa-body-loader__stream" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="pa-body-loader__skeleton" aria-hidden="true">
          <div class="pa-body-loader__skel-card"></div>
          <div class="pa-body-loader__skel-card"></div>
          <div class="pa-body-loader__skel-card"></div>
          <div class="pa-body-loader__skel-card"></div>
        </div>
      </div>`;
  function resolveHost() {
    return document.body;
  }
  window.__paEnsureBodyLoader = function ensureBodyLoader(show, message) {
    const host = resolveHost();
    if (!host) return null;
    let el = document.getElementById("paBodyLoader");
    if (!el) {
      el = document.createElement("div");
      el.className = "pa-body-loader";
      el.id = "paBodyLoader";
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      el.innerHTML = MARKUP;
      host.appendChild(el);
    } else if (el.parentElement !== host) {
      host.appendChild(el);
    }
    const label = el.querySelector(".pa-body-loader__label");
    if (message && label) label.textContent = message;
    if (show) {
      document.body.classList.add("pa-loading-active");
      el.classList.remove("is-hiding");
      el.classList.add("visible");
      el.setAttribute("aria-busy", "true");
    }
    return el;
  };
})();
