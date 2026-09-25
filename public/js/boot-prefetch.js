(function bootPrefetch() {
  if (typeof window === "undefined") return;
  var config = window.__paPrefetchConfig || {};
  var PAGE_KEYS = config.PAGE_KEYS || {};
  var ROUTE_BY_KEY = config.ROUTE_BY_KEY || {};
  var resolvePage = config.resolvePage || function() {
    return "dashboard";
  };
  var APPEARANCE_CACHE_KEY = "pa_appearance_settings_v2";
  var FONT_STACKS = {
    inter: "'Inter', sans-serif",
    outfit: "'Outfit', sans-serif",
    "plus-jakarta-sans": "'Plus Jakarta Sans', sans-serif",
    manrope: "'Manrope', sans-serif",
    figtree: "'Figtree', sans-serif",
    "dm-sans": "'DM Sans', sans-serif",
    sora: "'Sora', sans-serif",
    "instrument-sans": "'Instrument Sans', sans-serif",
    "space-grotesk": "'Space Grotesk', sans-serif",
    onest: "'Onest', sans-serif",
    fraunces: "'Fraunces', serif",
    "source-serif-4": "'Source Serif 4', serif",
    literata: "'Literata', serif",
    "jetbrains-mono": "'JetBrains Mono', monospace",
    "ibm-plex-mono": "'IBM Plex Mono', monospace",
    "fira-code": "'Fira Code', monospace",
    "source-code-pro": "'Source Code Pro', monospace",
    "dm-mono": "'DM Mono', monospace"
  };
  var GOOGLE_FONT_URLS = {
    "plus-jakarta-sans": "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;600;700&display=swap",
    manrope: "https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;600;700&display=swap",
    figtree: "https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;600;700&display=swap",
    "dm-sans": "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap",
    sora: "https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&display=swap",
    "instrument-sans": "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&display=swap",
    "space-grotesk": "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap",
    onest: "https://fonts.googleapis.com/css2?family=Onest:wght@300;400;600;700&display=swap",
    fraunces: "https://fonts.googleapis.com/css2?family=Fraunces:wght@400;600;700&display=swap",
    "source-serif-4": "https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700&display=swap",
    literata: "https://fonts.googleapis.com/css2?family=Literata:wght@400;600;700&display=swap",
    "jetbrains-mono": "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap",
    "ibm-plex-mono": "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;700&display=swap",
    "fira-code": "https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;700&display=swap",
    "source-code-pro": "https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;700&display=swap",
    "dm-mono": "https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&display=swap"
  };
  function ensureGoogleFontEarly(fontId) {
    if (!fontId || fontId === "inter" || fontId === "outfit") return;
    var href = GOOGLE_FONT_URLS[fontId];
    if (!href) return;
    var linkId = "pa-gf-" + fontId;
    if (document.getElementById(linkId)) return;
    var link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }
  function registerCustomFontsEarly(customFonts) {
    if (!Array.isArray(customFonts) || !customFonts.length) return;
    var style = document.getElementById("pa-custom-fonts-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "pa-custom-fonts-style";
      document.head.appendChild(style);
    }
    var rules = [];
    customFonts.forEach(function(font) {
      if (!font || !font.familyName || !font.url) return;
      var family = String(font.familyName).replace(/'/g, "\\'");
      var url = String(font.url).replace(/"/g, '\\"');
      var format = font.format || "woff2";
      rules.push("@font-face{font-family:'" + family + `';src:url("` + url + `") format('` + format + "');font-display:swap;}");
      if (font.id) FONT_STACKS[font.id] = "'" + family + "', sans-serif";
    });
    style.textContent = rules.join("\n");
  }
  var RADIUS_MAP = {
    "0px": ["0px", "0px", "0px", "0px"],
    "5px": ["5px", "10px", "15px", "20px"],
    "14px": ["8px", "15px", "18px", "24px"],
    "25px": ["14px", "18px", "20px", "30px"]
  };
  var SIZE_MAP = {
    "12px": ["12px", "14px", "18px", "36px", "12px"],
    "14px": ["14px", "16px", "22px", "42px", "14px"],
    "16px": ["16px", "18px", "24px", "48px", "16px"],
    "18px": ["18px", "20px", "26px", "52px", "18px"]
  };
  var ICON_SIZE_MAP = {
    small: { nav: "12px", action: "14px", stat: "18px", header: "16px", empty: "32px", toggle: "14px", circle: "38px", btn: "34px" },
    medium: { nav: "14px", action: "16px", stat: "22px", header: "18px", empty: "40px", toggle: "16px", circle: "44px", btn: "38px" },
    large: { nav: "18px", action: "20px", stat: "26px", header: "22px", empty: "48px", toggle: "20px", circle: "52px", btn: "44px" }
  };
  function hexToRgb(hex) {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16)
    ].join(",");
  }
  function applyAppearanceFromLocalStorage() {
    try {
      let applyBodyStyles2 = function() {
        if (!document.body) return;
        document.body.classList.toggle("light", !dark);
        document.body.style.fontFamily = stack;
        document.body.style.fontWeight = weight;
      };
      var applyBodyStyles = applyBodyStyles2;
      var raw = localStorage.getItem(APPEARANCE_CACHE_KEY);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (!s || typeof s !== "object") return;
      var theme = s.theme === "light" || s.theme === "system" ? s.theme : "dark";
      var systemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      var dark = theme === "system" ? systemDark : theme === "dark";
      var root = document.documentElement;
      root.style.colorScheme = dark ? "dark" : "light";
      var accent = /^#[0-9a-fA-F]{6}$/.test(s.accent) ? s.accent : "#ff6600";
      var rgb = hexToRgb(accent);
      root.style.setProperty("--pa-orange", accent);
      root.style.setProperty("--pa-orange-rgb", rgb);
      root.style.setProperty("--pa-orange-dim", "rgba(" + rgb + ", 0.12)");
      root.style.setProperty("--pa-orange-hover", accent);
      root.style.setProperty("--pa-orange-glow", "rgba(" + rgb + ", 0.22)");
      root.style.setProperty("--pa-orange-border", "rgba(" + rgb + ", 0.28)");
      root.style.setProperty("--pa-orange-lighter", "rgba(" + rgb + ", 0.5)");
      var fontSize = SIZE_MAP[s.fontSize] ? s.fontSize : "14px";
      var sizes = SIZE_MAP[fontSize];
      root.style.setProperty("--pa-fs-md", sizes[0]);
      root.style.setProperty("--pa-fs-lg", sizes[1]);
      root.style.setProperty("--pa-fs-xl", sizes[2]);
      root.style.setProperty("--pa-fs-xxl", sizes[3]);
      root.style.fontSize = sizes[4];
      if (Array.isArray(s.customFonts)) registerCustomFontsEarly(s.customFonts);
      if (s.fontFamily) ensureGoogleFontEarly(s.fontFamily);
      var stack = FONT_STACKS[s.fontFamily] || FONT_STACKS.inter;
      var weight = s.fontWeight === "300" || s.fontWeight === "600" || s.fontWeight === "700" ? s.fontWeight : "400";
      root.style.setProperty("--pa-fw-sm", weight);
      root.style.setProperty("--pa-fw-md", weight);
      root.style.setProperty("--pa-fw-lg", String(parseInt(weight, 10) + 100));
      root.style.setProperty("--pa-fw-xl", String(parseInt(weight, 10) + 200));
      if (document.body) applyBodyStyles2();
      else document.addEventListener("DOMContentLoaded", applyBodyStyles2, { once: true });
      var radiusKey = RADIUS_MAP[s.cornerRadius] ? s.cornerRadius : "14px";
      var radius = RADIUS_MAP[radiusKey];
      root.style.setProperty("--pa-radius", radiusKey);
      root.style.setProperty("--pa-radius-sm", radius[0]);
      root.style.setProperty("--pa-radius-md", radius[1]);
      root.style.setProperty("--pa-radius-lg", radius[2]);
      root.style.setProperty("--pa-radius-xl", radius[3]);
      var spacing = s.cardSpacing === "5px" || s.cardSpacing === "15px" ? s.cardSpacing : "10px";
      root.style.setProperty("--pa-card-gap", spacing);
      root.dataset.cardSpacing = spacing;
      var iconKey = ICON_SIZE_MAP[s.iconSize] ? s.iconSize : "medium";
      var iconPreset = ICON_SIZE_MAP[iconKey];
      root.style.setProperty("--pa-icon-nav", iconPreset.nav);
      root.style.setProperty("--pa-icon-action", iconPreset.action);
      root.style.setProperty("--pa-icon-stat", iconPreset.stat);
      root.style.setProperty("--pa-icon-header", iconPreset.header);
      root.style.setProperty("--pa-icon-empty", iconPreset.empty);
      root.style.setProperty("--pa-icon-toggle", iconPreset.toggle);
      root.style.setProperty("--pa-icon-circle", iconPreset.circle);
      root.style.setProperty("--pa-icon-btn", iconPreset.btn);
      root.dataset.iconSize = iconKey;
    } catch (e) {
    }
  }
  window.__paWriteAppearanceCache = function writeAppearanceCache(settings) {
    if (!settings) return;
    try {
      localStorage.setItem(APPEARANCE_CACHE_KEY, JSON.stringify(settings));
    } catch (e) {
    }
  };
  applyAppearanceFromLocalStorage();
  function isAuthRoute(path) {
    return /\/(login|forget-password|reset-password)(\/|$)/.test(path);
  }
  function ensureAppearancePrefetch(path, fetchOpts, bag) {
    if (bag.appearance_settings_v2) {
      queueDynamicFavicon(bag.appearance_settings_v2);
      return;
    }
    var appearanceUrl = isAuthRoute(path) ? "/api/appearance/public" : "/api/appearance";
    bag.appearance_settings_v2 = fetch(appearanceUrl, fetchOpts).then(function(res) {
      return res.ok ? res.json() : null;
    }).then(function(data) {
      if (data && typeof window.__paWriteAppearanceCache === "function") {
        window.__paWriteAppearanceCache(data);
      }
      return data;
    }).catch(function() {
      return null;
    });
    queueDynamicFavicon(bag.appearance_settings_v2);
  }
  function prefetchPageKeys(page, bag, fetchOpts) {
    var keys = PAGE_KEYS[page] || [];
    keys.forEach(function(key) {
      if (bag[key]) return;
      var route = ROUTE_BY_KEY[key];
      if (!route) return;
      bag[key] = fetch(route, fetchOpts).then(function(res) {
        return res.ok ? res.json() : null;
      }).catch(function() {
        return null;
      });
    });
  }
  function startBootstrap(page, bag, fetchOpts) {
    var url = "/api/bootstrap?page=" + encodeURIComponent(page);
    bag.__bootstrap = fetch(url, fetchOpts).then(function(res) {
      return res.ok ? res.json() : null;
    }).then(function(payload) {
      if (!payload) return null;
      if (payload.appearance && typeof window.__paWriteAppearanceCache === "function") {
        window.__paWriteAppearanceCache(payload.appearance);
      }
      queueDynamicFavicon(Promise.resolve(payload.appearance));
      return payload;
    }).catch(function() {
      return null;
    });
  }
  function startPrefetch(path) {
    var fetchOpts = {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    };
    var bag = window.__paPrefetch || {};
    if (isAuthRoute(path)) {
      ensureAppearancePrefetch(path, fetchOpts, bag);
      window.__paPrefetch = bag;
      return;
    }
    var page = resolvePage(path);
    if (!window.__paDidBootstrap) {
      window.__paDidBootstrap = true;
      startBootstrap(page, bag, fetchOpts);
    } else {
      ensureAppearancePrefetch(path, fetchOpts, bag);
      prefetchPageKeys(page, bag, fetchOpts);
    }
    window.__paPrefetch = bag;
  }
  function queueDynamicFavicon(appearancePromise) {
    if (!appearancePromise || typeof appearancePromise.then !== "function") return;
    appearancePromise.then(function(data) {
      if (typeof window.__paUpdateFavicon === "function") {
        window.__paUpdateFavicon(data);
        return;
      }
      return import("/js/utils/favicon.js").then(function(mod) {
        return mod.updateFaviconFromAppearance(data);
      });
    }).catch(function() {
    });
  }
  function warmPrefetchPath(path) {
    if (!path || isAuthRoute(path)) return;
    var fetchOpts = {
      method: "GET",
      credentials: "same-origin",
      headers: { Accept: "application/json" }
    };
    var bag = window.__paPrefetch || {};
    var page = resolvePage(path);
    prefetchPageKeys(page, bag, fetchOpts);
    window.__paPrefetch = bag;
  }
  window.__paStartPrefetch = startPrefetch;
  window.__paWarmPrefetchPath = warmPrefetchPath;
  startPrefetch(window.location.pathname);
})();
