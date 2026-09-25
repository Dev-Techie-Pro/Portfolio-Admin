class BodyLoader {
  constructor() {
    this._count = 0;
    this._host = null;
    this._el = null;
    this._labelEl = null;
    this._defaultMessage = "Loading your data\u2026";
    this._hideTimer = null;
    this._showFrame = null;
    this._EXIT_MS = 220;
  }
  _resolveHost() {
    return document.body;
  }
  _findLoader() {
    return document.getElementById("paBodyLoader");
  }
  _ensureOnBody(el) {
    if (el && el.parentElement !== document.body) {
      document.body.appendChild(el);
    }
  }
  _cancelShowFrame() {
    if (this._showFrame) {
      cancelAnimationFrame(this._showFrame);
      this._showFrame = null;
    }
  }
  mount() {
    if (typeof window.__paEnsureBodyLoader === "function") {
      this._el = window.__paEnsureBodyLoader(false);
      this._host = this._resolveHost();
      if (this._el) {
        this._labelEl = this._el.querySelector(".pa-body-loader__label");
      }
      return;
    }
    this._host = this._resolveHost();
    if (!this._host) return;
    const existing = this._findLoader();
    if (existing) {
      this._ensureOnBody(existing);
      this._el = existing;
      this._labelEl = existing.querySelector(".pa-body-loader__label");
      return;
    }
    const el = document.createElement("div");
    el.className = "pa-body-loader";
    el.id = "paBodyLoader";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-busy", "true");
    el.innerHTML = `
      <div class="pa-body-loader__veil" aria-hidden="true"></div>
      <div class="pa-body-loader__panel">
        <div class="pa-body-loader__orbit" aria-hidden="true">
          <span class="pa-body-loader__ring"></span>
          <span class="pa-body-loader__ring pa-body-loader__ring--delay"></span>
          <span class="pa-body-loader__core"><i class="ri-database-2-line"></i></span>
        </div>
        <p class="pa-body-loader__label">${this._defaultMessage}</p>
        <div class="pa-body-loader__stream" aria-hidden="true">
          <span></span><span></span><span></span><span></span>
        </div>
        <div class="pa-body-loader__skeleton" aria-hidden="true">
          <div class="pa-body-loader__skel-card"></div>
          <div class="pa-body-loader__skel-card"></div>
          <div class="pa-body-loader__skel-card"></div>
          <div class="pa-body-loader__skel-card"></div>
        </div>
      </div>
    `;
    this._host.appendChild(el);
    this._el = el;
    this._labelEl = el.querySelector(".pa-body-loader__label");
  }
  begin(message) {
    const msg = message || this._defaultMessage;
    if (typeof window.__paEnsureBodyLoader === "function") {
      this._el = window.__paEnsureBodyLoader(true, msg);
      this._host = this._resolveHost();
      this._labelEl = this._el?.querySelector(".pa-body-loader__label") || null;
    } else {
      this.mount();
    }
    if (!this._host || !this._el) return;
    this._cancelShowFrame();
    if (this._hideTimer) {
      clearTimeout(this._hideTimer);
      this._hideTimer = null;
    }
    if (msg && this._labelEl) this._labelEl.textContent = msg;
    this._count += 1;
    document.body.classList.add("pa-loading-active");
    this._el.classList.remove("is-hiding");
    this._el.classList.add("visible");
    this._el.setAttribute("aria-busy", "true");
  }
  end() {
    if (!this._el) return;
    this._count = Math.max(0, this._count - 1);
    if (this._count === 0) this._hide();
  }
  reset() {
    this._count = 0;
    this._hide();
  }
  _hide() {
    this._cancelShowFrame();
    this._host = this._resolveHost();
    if (!this._host || !this._el) return;
    this._el.classList.add("is-hiding");
    this._el.classList.remove("visible");
    if (this._count === 0) document.body.classList.remove("pa-loading-active");
    if (this._labelEl) this._labelEl.textContent = this._defaultMessage;
    this._el.setAttribute("aria-busy", "false");
    if (this._hideTimer) clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => {
      this._el?.classList.remove("is-hiding");
      this._hideTimer = null;
    }, this._EXIT_MS);
  }
  async wrap(promise, message) {
    this.begin(message);
    try {
      return await promise;
    } finally {
      this.end();
    }
  }
}
const bodyLoader = new BodyLoader();
export {
  bodyLoader
};
