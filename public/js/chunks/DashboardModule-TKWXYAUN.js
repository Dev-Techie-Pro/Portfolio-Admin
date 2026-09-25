import {
  syncPaSelect
} from "./chunk-BHVLEK4H.js";
import {
  CATEGORY_META_PROJECTS
} from "./chunk-ZWB776SN.js";
import "./chunk-Z6HRAGMQ.js";
import "./chunk-SUXWAKOI.js";
import "./chunk-YFM5AGT7.js";
import "./chunk-QJVHZZLM.js";
import {
  GROUP_META,
  LEVEL_META
} from "./chunk-SDDXANHE.js";
import "./chunk-JUAPOJ2G.js";
import "./chunk-UDFFEWPW.js";
import "./chunk-CP27TRUO.js";
import "./chunk-SCZE3YCL.js";
import "./chunk-NETZJRD6.js";
import "./chunk-JRSPEK52.js";
import {
  formatDate,
  timeAgo
} from "./chunk-3FVVIY3E.js";
import "./chunk-DUXXWVBL.js";
import "./chunk-WGXNH5AX.js";
import {
  $,
  $id,
  Module,
  escapeHtml,
  storage
} from "./chunk-OGR5OR6D.js";

// client/utils/dashboardCharts.ts
var chartInstances = /* @__PURE__ */ new WeakMap();
var apexChartsLoadPromise = null;
function ensureApexChartsLoaded() {
  if (typeof window !== "undefined" && typeof ApexCharts !== "undefined") {
    return Promise.resolve();
  }
  if (apexChartsLoadPromise) return apexChartsLoadPromise;
  apexChartsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="/js/vendor/apexcharts.min.js"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("ApexCharts failed to load")), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "/js/vendor/apexcharts.min.js";
    script.async = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("ApexCharts failed to load")), { once: true });
    document.head.appendChild(script);
  });
  return apexChartsLoadPromise;
}
function resolveChartColor(value) {
  if (typeof value !== "string") return value;
  const match = value.match(/^var\((--[\w-]+)\)$/);
  if (!match) return value;
  const resolved = getComputedStyle(document.body).getPropertyValue(match[1]).trim();
  return resolved || value;
}
function getAccentCssVar() {
  return "var(--pa-orange)";
}
var CHART_SUPPORT_COLORS = [
  "var(--pa-web)",
  "var(--pa-edu)",
  "var(--pa-pink)",
  "var(--pa-purple)",
  "var(--pa-teal)",
  "var(--pa-red)"
];
function assignSegmentColors(segments) {
  if (!segments?.length) return [];
  const maxValue = Math.max(...segments.map((seg) => Number(seg.value) || 0));
  let accentUsed = false;
  let supportIndex = 0;
  return segments.map((seg) => {
    const value = Number(seg.value) || 0;
    if (!accentUsed && value === maxValue && maxValue > 0) {
      accentUsed = true;
      return { ...seg, color: getAccentCssVar() };
    }
    const color = CHART_SUPPORT_COLORS[supportIndex % CHART_SUPPORT_COLORS.length];
    supportIndex += 1;
    return { ...seg, color };
  });
}
function seriesWeight(series) {
  if (typeof series.weight === "number") return series.weight;
  if (Array.isArray(series.values)) {
    return series.values.reduce((sum, value) => sum + (Number(value) || 0), 0);
  }
  if (Array.isArray(series.points)) {
    return series.points.reduce((sum, point) => sum + (Number(point.y) || 0), 0);
  }
  return 0;
}
function assignSeriesColors(seriesList) {
  if (!seriesList?.length) return [];
  const weights = seriesList.map((series) => seriesWeight(series));
  const maxWeight = Math.max(...weights, 0);
  let accentUsed = false;
  let supportIndex = 0;
  return seriesList.map((series, index) => {
    if (!accentUsed && weights[index] === maxWeight && maxWeight > 0) {
      accentUsed = true;
      return getAccentCssVar();
    }
    const color = CHART_SUPPORT_COLORS[supportIndex % CHART_SUPPORT_COLORS.length];
    supportIndex += 1;
    return color;
  });
}
function themeColors() {
  const style = getComputedStyle(document.body);
  return {
    text: style.getPropertyValue("--pa-text").trim() || "#e8e8ea",
    textFaint: style.getPropertyValue("--pa-text-faint").trim() || "#9a9aa0",
    textDim: style.getPropertyValue("--pa-text-dim").trim() || "#b4b4bc",
    borderSoft: style.getPropertyValue("--pa-border-soft").trim() || "#2a2a30",
    bgCard: style.getPropertyValue("--pa-bg-card").trim() || "#141418"
  };
}
function baseChartOptions(type) {
  const colors = themeColors();
  return {
    chart: {
      type,
      background: "transparent",
      fontFamily: "inherit",
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 650,
        animateGradually: { enabled: true, delay: 80 }
      },
      dropShadow: {
        enabled: type === "area" || type === "line",
        top: 2,
        left: 0,
        blur: 6,
        opacity: 0.12
      }
    },
    grid: {
      borderColor: colors.borderSoft,
      strokeDashArray: 4,
      padding: { left: 8, right: 8, top: 0, bottom: 0 }
    },
    xaxis: {
      labels: {
        style: { colors: colors.textFaint, fontSize: "11px", fontWeight: 500 }
      },
      axisBorder: { show: true, color: colors.borderSoft },
      axisTicks: { show: true, color: colors.borderSoft },
      crosshairs: { show: type === "area" || type === "line" }
    },
    yaxis: {
      labels: {
        style: { colors: colors.textFaint, fontSize: "11px", fontWeight: 500 }
      }
    },
    tooltip: {
      theme: document.body.classList.contains("light") ? "light" : "dark",
      style: { fontSize: "12px" }
    },
    legend: { show: false },
    dataLabels: { enabled: false }
  };
}
function resolveChartHeight(mountEl, fallback = 230) {
  if (!mountEl) return fallback;
  const measured = mountEl.clientHeight || parseFloat(getComputedStyle(mountEl).height) || 0;
  return measured > 0 ? Math.round(measured) : fallback;
}
function resolveChartWidth(mountEl) {
  if (!mountEl) return "100%";
  const measured = mountEl.clientWidth;
  return measured > 0 ? measured : "100%";
}
function sanitizeSeriesData(values) {
  return (values || []).map((value) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  });
}
function destroyChart(mountEl) {
  if (!mountEl) return;
  const instance = chartInstances.get(mountEl);
  if (instance) {
    instance.destroy();
    chartInstances.delete(mountEl);
  }
  mountEl.innerHTML = "";
}
function mountChart(mountEl, options) {
  if (!mountEl || typeof ApexCharts === "undefined") return null;
  destroyChart(mountEl);
  const height = resolveChartHeight(mountEl, options?.chart?.height || 230);
  const width = resolveChartWidth(mountEl);
  const series = (options.series || []).map((entry) => ({
    ...entry,
    data: sanitizeSeriesData(entry.data)
  }));
  const chart = new ApexCharts(mountEl, {
    ...options,
    series,
    chart: {
      ...options.chart,
      height,
      width
    }
  });
  chart.render();
  chartInstances.set(mountEl, chart);
  return chart;
}
function donutSegmentCircles(segments, size, strokeWidth) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);
  if (!total) return "";
  const radius = (size - strokeWidth) / 2 - 1;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;
  return segments.map((seg) => {
    const length = seg.value / total * circumference;
    const color = resolveChartColor(seg.color);
    const circle = `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="butt" stroke-dasharray="${length} ${Math.max(circumference - length, 0)}" stroke-dashoffset="${-cumulative}" transform="rotate(-90 ${cx} ${cy})"></circle>`;
    cumulative += length;
    return circle;
  }).join("");
}
function renderDonutChart(mountEl, segments) {
  if (!mountEl) return null;
  destroyChart(mountEl);
  const wrap = mountEl.closest(".pa-donut-svg-wrap");
  const measured = wrap ? Math.round(Math.min(wrap.clientWidth, wrap.clientHeight) || 0) : 0;
  const size = Math.max(136, Math.min(measured || 160, 188));
  const strokeWidth = Math.round(size * 0.138);
  const hasData = segments.length > 0 && segments.some((seg) => seg.value > 0);
  const rings = hasData ? donutSegmentCircles(segments, size, strokeWidth) : `<circle cx="${size / 2}" cy="${size / 2}" r="${(size - strokeWidth) / 2 - 1}" fill="none" stroke="${resolveChartColor("var(--pa-border-soft)")}" stroke-width="${strokeWidth}" opacity="0.55"></circle>`;
  mountEl.innerHTML = `<svg class="pa-donut-svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="presentation" aria-hidden="true">${rings}</svg>`;
  return null;
}
function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = angleDeg * Math.PI / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad)
  };
}
function describeArc(cx, cy, r, startAngle, endAngle) {
  if (endAngle <= startAngle) return "";
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${largeArcFlag} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}
function renderProjGaugeChart(mountEl, pct, fillColor = "var(--pa-green)") {
  if (!mountEl) return null;
  destroyChart(mountEl);
  const value = Math.max(0, Math.min(100, pct));
  const width = 220;
  const height = 118;
  const strokeWidth = 20;
  const r = 88;
  const cx = width / 2;
  const cy = height - 6;
  const trackColor = resolveChartColor("var(--pa-border-soft)");
  const color = resolveChartColor(fillColor);
  const trackPath = describeArc(cx, cy, r, 180, 360);
  const endAngle = 180 + value / 100 * 180;
  const fillPath = value > 0 ? describeArc(cx, cy, r, 180, Math.max(endAngle, 181.5)) : "";
  mountEl.innerHTML = `<svg class="pa-proj-gauge-svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" preserveAspectRatio="xMidYMid meet" role="presentation" aria-hidden="true">
    <path class="pa-proj-gauge-track" d="${trackPath}" fill="none" stroke="${trackColor}" stroke-width="${strokeWidth}" stroke-linecap="round" opacity="0.5"/>
    ${fillPath ? `<path class="pa-proj-gauge-fill" d="${fillPath}" fill="none" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round"/>` : ""}
  </svg>`;
  return null;
}
function renderAreaChart(mountEl, points, color = "var(--pa-green)") {
  if (!mountEl) return null;
  const resolved = resolveChartColor(color);
  const safePoints = (points || []).length ? points : [{ label: "-", y: 0 }];
  const categories = safePoints.map((p) => p.label);
  const data = safePoints.map((p) => p.y);
  return mountChart(mountEl, {
    ...baseChartOptions("area"),
    series: [{ name: "Count", data }],
    colors: [resolved],
    xaxis: {
      ...baseChartOptions("area").xaxis,
      categories
    },
    yaxis: {
      ...baseChartOptions("area").yaxis,
      min: 0,
      forceNiceScale: true
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 0.35,
        opacityFrom: 0.42,
        opacityTo: 0.04,
        stops: [0, 92, 100]
      }
    },
    stroke: {
      curve: "smooth",
      width: 2.75
    },
    markers: {
      size: 4,
      strokeWidth: 2,
      strokeColors: themeColors().bgCard,
      hover: { size: 6 }
    }
  });
}
function renderMultiLineChart(mountEl, seriesDefs) {
  if (!mountEl) return null;
  const safeDefs = (seriesDefs || []).length ? seriesDefs : [{ name: "Count", color: "var(--pa-green)", points: [{ label: "-", y: 0 }] }];
  const categories = safeDefs[0]?.points?.map((p) => p.label) || ["-"];
  return mountChart(mountEl, {
    ...baseChartOptions("line"),
    series: safeDefs.map((def) => ({
      name: def.name,
      data: (def.points || []).map((p) => p.y)
    })),
    colors: safeDefs.map((def) => resolveChartColor(def.color)),
    xaxis: {
      ...baseChartOptions("line").xaxis,
      categories
    },
    yaxis: {
      ...baseChartOptions("line").yaxis,
      min: 0,
      forceNiceScale: true
    },
    stroke: {
      curve: "smooth",
      width: 2.5
    },
    markers: {
      size: 4,
      strokeWidth: 2,
      strokeColors: themeColors().bgCard,
      hover: { size: 6 }
    },
    tooltip: {
      ...baseChartOptions("line").tooltip,
      shared: true,
      intersect: false
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "right",
      fontSize: "11px",
      fontWeight: 600,
      labels: { colors: themeColors().textDim },
      markers: { width: 8, height: 8, radius: 12 },
      itemMargin: { horizontal: 10 }
    }
  });
}

// client/modules/dashboard/DashboardModule.ts
var KNOWN_PROJECT_STATUSES = /* @__PURE__ */ new Set([
  "Completed",
  "In Progress",
  "Pending",
  "Draft",
  "On Hold",
  "Cancelled"
]);
var STATUS_BADGE_CLASS = {
  Completed: "completed",
  "In Progress": "in-progress",
  Pending: "pending",
  Draft: "draft",
  "On Hold": "on-hold",
  Cancelled: "cancelled"
};
var PROJECT_STATUS_ORDER = ["Completed", "In Progress", "Pending", "Draft", "On Hold", "Cancelled"];
var TECH_GROUP_ORDER = ["frontend", "backend", "database", "devops", "mobile", "design", "other"];
var PROJECT_CATEGORY_ORDER = Object.keys(CATEGORY_META_PROJECTS);
var TECH_LEVEL_ORDER = ["expert", "advanced", "intermediate", "beginner"];
var THUMB_CLASSES = ["pa-dash-thumb-orange", "pa-dash-thumb-purple", "pa-dash-thumb-pink", "pa-dash-thumb-blue"];
var ACTIVITY_DOT_CLASSES = ["green", "pink", "blue", "cyan"];
var ACTIVITY_TYPE_ICONS = {
  user_action: "ri-user-line",
  system_event: "ri-cpu-line",
  content_change: "ri-file-edit-line",
  other: "ri-more-line"
};
var ACTIVITY_ACTION_ICONS = {
  "user.login": "ri-login-box-line",
  "user.logout": "ri-logout-box-line",
  "user.password.changed": "ri-lock-password-line",
  "user.password.reset": "ri-lock-password-line",
  "user.avatar.updated": "ri-user-line",
  "media.created": "ri-image-add-line",
  "media.updated": "ri-image-edit-line",
  "media.deleted": "ri-image-line",
  "project.created": "ri-code-s-slash-line",
  "blog.created": "ri-article-line",
  "skill.created": "ri-stack-line",
  "experience.created": "ri-briefcase-line",
  "testimonial.created": "ri-chat-quote-line"
};
var CATEGORY_ICONS = {
  enterprise: "ri-building-2-line",
  educational: "ri-graduation-cap-line",
  desktop: "ri-computer-line",
  medical: "ri-heart-pulse-line",
  ecommerce: "ri-shopping-bag-line",
  travel: "ri-flight-takeoff-line",
  web: "ri-globe-line",
  nonprofit: "ri-hand-heart-line"
};
var DEFAULT_ICON = "ri-apps-line";
var MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function parseYearMonth(ym) {
  if (!ym) return null;
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return null;
  return new Date(y, m - 1, 1);
}
function mondayIndex(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return (d.getDay() + 6) % 7;
}
var DashboardModule = class extends Module {
  constructor() {
    super({ name: "Dashboard" });
    this.projectsYear = (/* @__PURE__ */ new Date()).getFullYear();
    this.overviewPeriod = "month";
    this.statusFilter = "all";
    this.techGroupFilter = "all";
    this.completionCategoryFilter = "all";
    this.techLevelFilter = "all";
  }
  async reload() {
    await this.load();
    this.render();
  }
  async load() {
    const [
      projects,
      technologies,
      experience,
      testimonials,
      media,
      tools,
      categoryMeta,
      recentActivities
    ] = await Promise.all([
      storage.get("pa_projects", null),
      storage.get("pa_technologies", null),
      storage.get("pa_experience", null),
      storage.get("pa_testimonials", null),
      storage.get("pa_media_library", null),
      storage.get("pa_tools", null),
      storage.get("pa_category_meta", null),
      storage.get("pa_recent_activities", { activities: [] })
    ]);
    this.projects = projects || [];
    this.technologies = technologies || [];
    this.experience = experience || [];
    this.testimonials = testimonials || [];
    this.media = media || [];
    this.tools = tools || [];
    this.categoryMeta = categoryMeta || {};
    this.recentActivities = recentActivities?.activities || [];
  }
  render() {
    this.populateYearDropdown();
    this.populateStatusDropdown();
    this.populateTechGroupDropdown();
    this.populateCompletionCategoryDropdown();
    this.populateTechLevelDropdown();
    this.renderStatCards();
    this.renderSparklines();
    this.renderRecentProjects();
    this.renderRecentActivity();
    this.renderPortfolioOverview();
    this._scheduleChartRender();
  }
  _scheduleChartRender() {
    void ensureApexChartsLoaded().catch(() => {
    }).then(() => {
      const renderWhenReady = () => {
        if (typeof ApexCharts === "undefined") return false;
        const mounts = document.querySelectorAll(".pa-canvasjs-mount-line, .pa-canvasjs-mount-multiline");
        if (mounts.length > 0) {
          const hasSize = [...mounts].every((el) => {
            const h = el.clientHeight || parseFloat(getComputedStyle(el).height) || 0;
            return h > 0;
          });
          if (!hasSize) return false;
        }
        this._renderCharts();
        return true;
      };
      if (renderWhenReady()) return;
      if (this._chartWaitId) return;
      let attempts = 0;
      const tick = () => {
        if (renderWhenReady()) {
          this._chartWaitId = null;
          return;
        }
        attempts += 1;
        if (attempts < 120) {
          this._chartWaitId = requestAnimationFrame(tick);
        } else {
          this._chartWaitId = null;
          if (typeof ApexCharts !== "undefined") this._renderCharts();
        }
      };
      this._chartWaitId = requestAnimationFrame(tick);
    });
  }
  _renderCharts() {
    this.renderStatusDonut();
    this.renderTechGroupDonut();
    this.renderCompletionGauge();
    this.renderProjectsOverTimeLine();
    this.renderWeeklyActivityChart();
    this.renderTechLevelDonut();
  }
  bindEvents() {
    this.onBus("appearance:updated", () => {
      this.renderSparklines();
      this._renderCharts();
    });
    const yearSelect = $id("dashProjectsYearSelect");
    if (yearSelect) {
      this.on(yearSelect, "change", () => {
        this.projectsYear = Number(yearSelect.value) || (/* @__PURE__ */ new Date()).getFullYear();
        this.renderProjectsOverTimeLine();
      });
    }
    const periodSelect = $id("dashOverviewPeriodSelect");
    if (periodSelect) {
      this.on(periodSelect, "change", () => {
        this.overviewPeriod = periodSelect.value || "month";
        this.renderPortfolioOverview();
      });
    }
    const statusSelect = $id("dashStatusFilterSelect");
    if (statusSelect) {
      this.on(statusSelect, "change", () => {
        this.statusFilter = statusSelect.value || "all";
        this.renderStatusDonut();
      });
    }
    const techGroupSelect = $id("dashTechGroupFilterSelect");
    if (techGroupSelect) {
      this.on(techGroupSelect, "change", () => {
        this.techGroupFilter = techGroupSelect.value || "all";
        this.renderTechGroupDonut();
      });
    }
    const completionCategorySelect = $id("dashCompletionCategorySelect");
    if (completionCategorySelect) {
      this.on(completionCategorySelect, "change", () => {
        this.completionCategoryFilter = completionCategorySelect.value || "all";
        this.renderCompletionGauge();
      });
    }
    const techLevelSelect = $id("dashTechLevelFilterSelect");
    if (techLevelSelect) {
      this.on(techLevelSelect, "change", () => {
        this.techLevelFilter = techLevelSelect.value || "all";
        this.renderTechLevelDonut();
      });
    }
  }
  populateYearDropdown() {
    const select = $id("dashProjectsYearSelect");
    if (!select) return;
    const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
    const years = /* @__PURE__ */ new Set([currentYear]);
    this.projects.forEach((project) => {
      if (!project.createdAt) return;
      const year = new Date(project.createdAt).getFullYear();
      if (!Number.isNaN(year)) years.add(year);
    });
    const sortedYears = [...years].sort((a, b) => b - a);
    if (!sortedYears.includes(this.projectsYear)) {
      this.projectsYear = sortedYears[0] || currentYear;
    }
    select.innerHTML = sortedYears.map((year) => {
      const label = year === currentYear ? `This Year (${year})` : String(year);
      const selected = year === this.projectsYear ? " selected" : "";
      return `<option value="${year}"${selected}>${escapeHtml(label)}</option>`;
    }).join("");
    syncPaSelect(select);
  }
  populateStatusDropdown() {
    const select = $id("dashStatusFilterSelect");
    if (!select) return;
    const fromData = /* @__PURE__ */ new Set();
    this.projects.forEach((project) => {
      if (project.status) fromData.add(project.status);
    });
    const statuses = PROJECT_STATUS_ORDER.filter((status) => fromData.has(status) || KNOWN_PROJECT_STATUSES.has(status));
    fromData.forEach((status) => {
      if (!statuses.includes(status)) statuses.push(status);
    });
    if (this.statusFilter !== "all" && !statuses.includes(this.statusFilter)) {
      this.statusFilter = "all";
    }
    const options = [
      `<option value="all"${this.statusFilter === "all" ? " selected" : ""}>All Statuses</option>`,
      ...statuses.map((status) => {
        const selected = status === this.statusFilter ? " selected" : "";
        return `<option value="${escapeHtml(status)}"${selected}>${escapeHtml(status)}</option>`;
      })
    ];
    select.innerHTML = options.join("");
    syncPaSelect(select);
  }
  populateTechGroupDropdown() {
    const select = $id("dashTechGroupFilterSelect");
    if (!select) return;
    const fromData = /* @__PURE__ */ new Set();
    this.technologies.forEach((tech) => {
      fromData.add(tech.group || "other");
    });
    const groups = TECH_GROUP_ORDER.filter((group) => fromData.has(group) || GROUP_META[group]);
    fromData.forEach((group) => {
      if (!groups.includes(group)) groups.push(group);
    });
    if (this.techGroupFilter !== "all" && !groups.includes(this.techGroupFilter)) {
      this.techGroupFilter = "all";
    }
    const options = [
      `<option value="all"${this.techGroupFilter === "all" ? " selected" : ""}>All Groups</option>`,
      ...groups.map((group) => {
        const label = GROUP_META[group]?.label || group;
        const selected = group === this.techGroupFilter ? " selected" : "";
        return `<option value="${escapeHtml(group)}"${selected}>${escapeHtml(label)}</option>`;
      })
    ];
    select.innerHTML = options.join("");
    syncPaSelect(select);
  }
  getCategoryLabel(catKey) {
    return this.categoryMeta[catKey]?.label || CATEGORY_META_PROJECTS[catKey]?.label || catKey;
  }
  populateCompletionCategoryDropdown() {
    const select = $id("dashCompletionCategorySelect");
    if (!select) return;
    const fromData = /* @__PURE__ */ new Set();
    this.projects.forEach((project) => {
      if (project.catKey) fromData.add(project.catKey);
    });
    const categories = PROJECT_CATEGORY_ORDER.filter((catKey) => fromData.has(catKey) || CATEGORY_META_PROJECTS[catKey]);
    fromData.forEach((catKey) => {
      if (!categories.includes(catKey)) categories.push(catKey);
    });
    Object.keys(this.categoryMeta).forEach((catKey) => {
      if (!categories.includes(catKey)) categories.push(catKey);
    });
    if (this.completionCategoryFilter !== "all" && !categories.includes(this.completionCategoryFilter)) {
      this.completionCategoryFilter = "all";
    }
    const options = [
      `<option value="all"${this.completionCategoryFilter === "all" ? " selected" : ""}>All Categories</option>`,
      ...categories.map((catKey) => {
        const label = this.getCategoryLabel(catKey);
        const selected = catKey === this.completionCategoryFilter ? " selected" : "";
        return `<option value="${escapeHtml(catKey)}"${selected}>${escapeHtml(label)}</option>`;
      })
    ];
    select.innerHTML = options.join("");
    syncPaSelect(select);
  }
  populateTechLevelDropdown() {
    const select = $id("dashTechLevelFilterSelect");
    if (!select) return;
    const fromData = /* @__PURE__ */ new Set();
    this.technologies.forEach((tech) => {
      fromData.add(tech.level || "unrated");
    });
    const levels = TECH_LEVEL_ORDER.filter((level) => fromData.has(level) || LEVEL_META[level]);
    fromData.forEach((level) => {
      if (!levels.includes(level)) levels.push(level);
    });
    if (this.techLevelFilter !== "all" && !levels.includes(this.techLevelFilter)) {
      this.techLevelFilter = "all";
    }
    const options = [
      `<option value="all"${this.techLevelFilter === "all" ? " selected" : ""}>All Levels</option>`,
      ...levels.map((level) => {
        const label = LEVEL_META[level]?.label || level;
        const selected = level === this.techLevelFilter ? " selected" : "";
        return `<option value="${escapeHtml(level)}"${selected}>${escapeHtml(label)}</option>`;
      })
    ];
    select.innerHTML = options.join("");
    syncPaSelect(select);
  }
  getOverviewDateRange(period = this.overviewPeriod) {
    const now = /* @__PURE__ */ new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    switch (period) {
      case "month":
        return { start: new Date(year, month, 1), end: new Date(year, month + 1, 1) };
      case "last-month":
        return { start: new Date(year, month - 1, 1), end: new Date(year, month, 1) };
      case "quarter": {
        const quarterStart = Math.floor(month / 3) * 3;
        return { start: new Date(year, quarterStart, 1), end: new Date(year, quarterStart + 3, 1) };
      }
      case "year":
        return { start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1) };
      case "all":
      default:
        return null;
    }
  }
  countInRange(records, dateField, range) {
    if (!range) return records.length;
    const start = range.start.getTime();
    const end = range.end.getTime();
    return records.filter((record) => {
      const timestamp = record[dateField] ? new Date(record[dateField]).getTime() : NaN;
      return !Number.isNaN(timestamp) && timestamp >= start && timestamp < end;
    }).length;
  }
  renderStatCards() {
    this.setText("#dashTotalProjects", this.projects.length);
    this.setText("#dashTotalTech", this.technologies.length);
    this.setText("#dashTotalTools", this.tools.length);
    this.setText("#dashTotalTesti", this.testimonials.length);
    this.setText("#dashTotalExp", this.experience.length);
    this.updateStatTrend("dashTrendProjects", this.projects, "createdAt");
    this.updateStatTrend("dashTrendTech", this.technologies, "createdAt");
    this.updateStatTrend("dashTrendTools", this.tools, "createdAt");
    this.updateStatTrend("dashTrendTesti", this.testimonials, "createdAt");
    this.updateStatTrend("dashTrendExp", this.experience, "startDate", true);
  }
  countInMonth(records, dateField, monthOffset = 0, isYearMonth = false) {
    const now = /* @__PURE__ */ new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + monthOffset;
    const start = new Date(y, m, 1);
    const end = new Date(y, m + 1, 1);
    return records.filter((r) => {
      let t;
      if (isYearMonth) {
        const d = parseYearMonth(r[dateField]);
        t = d ? d.getTime() : NaN;
      } else {
        t = r[dateField] ? new Date(r[dateField]).getTime() : NaN;
      }
      return !Number.isNaN(t) && t >= start.getTime() && t < end.getTime();
    }).length;
  }
  monthlySeries(records, dateField, months = 7, isYearMonth = false) {
    const now = /* @__PURE__ */ new Date();
    const series = [];
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1);
      const count = records.filter((r) => {
        let t;
        if (isYearMonth) {
          const parsed = parseYearMonth(r[dateField]);
          t = parsed ? parsed.getTime() : NaN;
        } else {
          t = r[dateField] ? new Date(r[dateField]).getTime() : NaN;
        }
        return !Number.isNaN(t) && t >= d.getTime() && t < end.getTime();
      }).length;
      series.push(count);
    }
    return series;
  }
  renderSparkline(containerId, values, color) {
    const el = $id(containerId);
    if (!el) return;
    const w = 80;
    const h = 36;
    const max = Math.max(...values, 1);
    const pts = values.map((v, i) => {
      const x = values.length <= 1 ? w / 2 : i / (values.length - 1) * w;
      const y = h - v / max * (h - 6) - 3;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    el.innerHTML = `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${pts}"/></svg>`;
  }
  toolsSparklineSeries() {
    const total = this.tools.length;
    if (!total) return Array(7).fill(0);
    return Array.from({ length: 7 }, (_, i) => Math.max(1, Math.round(total * (i + 1) / 7)));
  }
  renderSparklines() {
    const sparkSeries = [
      { id: "dashSparkProjects", values: this.monthlySeries(this.projects, "createdAt") },
      { id: "dashSparkTech", values: this.monthlySeries(this.technologies, "createdAt") },
      { id: "dashSparkTools", values: this.toolsSparklineSeries() },
      { id: "dashSparkTesti", values: this.monthlySeries(this.testimonials, "createdAt") },
      { id: "dashSparkExp", values: this.monthlySeries(this.experience, "startDate", 7, true) }
    ];
    const colors = assignSeriesColors(sparkSeries);
    sparkSeries.forEach((series, index) => {
      this.renderSparkline(series.id, series.values, resolveChartColor(colors[index]));
    });
  }
  updateStatTrend(trendId, records, dateField, isYearMonth = false) {
    const changeEl = $id(trendId);
    if (!changeEl) return;
    const current = this.countInMonth(records, dateField, 0, isYearMonth);
    const previous = this.countInMonth(records, dateField, -1, isYearMonth);
    let pct = 0;
    if (previous > 0) pct = Math.round((current - previous) / previous * 100);
    else if (current > 0) pct = 100;
    if (pct > 0) {
      changeEl.className = "pa-dash-stat-change up";
      changeEl.innerHTML = `<i class="ri-arrow-up-line"></i> +${pct}%`;
    } else if (pct < 0) {
      changeEl.className = "pa-dash-stat-change down";
      changeEl.innerHTML = `<i class="ri-arrow-down-line"></i> ${pct}%`;
    } else {
      changeEl.className = "pa-dash-stat-change neutral";
      changeEl.innerHTML = `<i class="ri-subtract-line"></i> 0%`;
    }
  }
  setText(selector, value) {
    const el = $(selector);
    if (el) el.textContent = String(value);
  }
  buildDonut(cardEl, segments, centerLabel) {
    if (!cardEl) return;
    const container = $(".pa-donut-canvas", cardEl);
    const legend = $(".pa-donut-legend", cardEl);
    const centerValue = $(".pa-donut-center-value", cardEl);
    const coloredSegments = assignSegmentColors(segments);
    const total = coloredSegments.reduce((sum, seg) => sum + seg.value, 0);
    const safeTotal = total || 1;
    renderDonutChart(container, coloredSegments);
    if (centerValue) centerValue.textContent = centerLabel != null ? centerLabel : total;
    if (legend) {
      legend.innerHTML = coloredSegments.length ? coloredSegments.map((seg) => {
        const pct = Math.round(seg.value / safeTotal * 100);
        const dotColor = resolveChartColor(seg.color);
        return `<div class="pa-donut-legend-item">
          <span class="pa-donut-dot" style="background:${dotColor}"></span>
          <span class="pa-donut-legend-copy">
            <span class="pa-donut-legend-label">${escapeHtml(seg.label)}</span>
            <span class="pa-donut-legend-meta">${seg.value} \xB7 ${pct}%</span>
          </span>
        </div>`;
      }).join("") : `<div class="pa-donut-legend-item pa-donut-legend-item--empty"><span class="pa-donut-legend-label">No data yet</span></div>`;
    }
  }
  renderStatusDonut() {
    const card = $('[data-dash-donut="status"]');
    if (!card) return;
    const statusSelect = $id("dashStatusFilterSelect");
    if (statusSelect && statusSelect.value !== this.statusFilter) {
      statusSelect.value = this.statusFilter;
      syncPaSelect(statusSelect);
    }
    const filteredProjects = this.statusFilter === "all" ? this.projects : this.projects.filter((project) => (project.status || "Unknown") === this.statusFilter);
    const counts = {};
    filteredProjects.forEach((project) => {
      const status = project.status || "Unknown";
      counts[status] = (counts[status] || 0) + 1;
    });
    const segments = Object.entries(counts).map(([label, value]) => ({ label, value }));
    this.buildDonut(card, segments, filteredProjects.length);
  }
  renderTechGroupDonut() {
    const card = $('[data-dash-donut="tech-group"]');
    if (!card) return;
    const techGroupSelect = $id("dashTechGroupFilterSelect");
    if (techGroupSelect && techGroupSelect.value !== this.techGroupFilter) {
      techGroupSelect.value = this.techGroupFilter;
      syncPaSelect(techGroupSelect);
    }
    const filteredTechnologies = this.techGroupFilter === "all" ? this.technologies : this.technologies.filter((tech) => (tech.group || "other") === this.techGroupFilter);
    const counts = {};
    filteredTechnologies.forEach((tech) => {
      const group = tech.group || "other";
      counts[group] = (counts[group] || 0) + 1;
    });
    const segments = Object.entries(counts).map(([key, value]) => ({
      label: GROUP_META[key]?.label || key,
      value
    }));
    this.buildDonut(card, segments, filteredTechnologies.length);
  }
  renderTechLevelDonut() {
    const card = $('[data-dash-donut="tech-level"]');
    if (!card) return;
    const techLevelSelect = $id("dashTechLevelFilterSelect");
    if (techLevelSelect && techLevelSelect.value !== this.techLevelFilter) {
      techLevelSelect.value = this.techLevelFilter;
      syncPaSelect(techLevelSelect);
    }
    const filteredTechnologies = this.techLevelFilter === "all" ? this.technologies : this.technologies.filter((tech) => (tech.level || "unrated") === this.techLevelFilter);
    const counts = {};
    filteredTechnologies.forEach((tech) => {
      const level = tech.level || "unrated";
      counts[level] = (counts[level] || 0) + 1;
    });
    const keys = Object.keys(counts).sort((a, b) => TECH_LEVEL_ORDER.indexOf(a) - TECH_LEVEL_ORDER.indexOf(b));
    const segments = keys.map((key) => ({
      label: LEVEL_META[key]?.label || key,
      value: counts[key]
    }));
    this.buildDonut(card, segments, filteredTechnologies.length);
    const container = $(".pa-donut-canvas", card);
    if (container) container.setAttribute("aria-label", "Technologies by skill level donut chart");
  }
  renderCompletionGauge() {
    const card = $('[data-dash-gauge="projects-completion"]');
    if (!card) return;
    const completionCategorySelect = $id("dashCompletionCategorySelect");
    if (completionCategorySelect && completionCategorySelect.value !== this.completionCategoryFilter) {
      completionCategorySelect.value = this.completionCategoryFilter;
      syncPaSelect(completionCategorySelect);
    }
    const filteredProjects = this.completionCategoryFilter === "all" ? this.projects : this.projects.filter((project) => project.catKey === this.completionCategoryFilter);
    const total = filteredProjects.length;
    const completed = filteredProjects.filter((project) => project.status === "Completed").length;
    const pending = Math.max(0, total - completed);
    const pct = total ? Math.round(completed / total * 100) : 0;
    const tone = total === 0 ? "neutral" : pct >= 80 ? "excellent" : pct >= 50 ? "good" : "low";
    const toneMeta = {
      neutral: { color: "var(--pa-text-faint)", label: "No projects yet" },
      excellent: { color: "var(--pa-green)", label: "Excellent progress" },
      good: { color: "var(--pa-web)", label: "Good progress" },
      low: { color: getAccentCssVar(), label: "Needs attention" }
    }[tone];
    card.setAttribute("data-gauge-tone", tone);
    const container = $(".pa-gauge-canvas", card);
    const gaugeColor = pct > 0 ? getAccentCssVar() : toneMeta.color;
    renderProjGaugeChart(container, pct, gaugeColor);
    if (container) container.setAttribute("aria-label", `Projects completion rate gauge showing ${pct} percent`);
    const valueEl = $id("dashCompletionGaugeValue");
    if (valueEl) valueEl.textContent = `${pct}%`;
    const badgeEl = $id("dashCompletionGaugeBadge");
    if (badgeEl) badgeEl.textContent = toneMeta.label;
    const completedEl = $id("dashCompletionGaugeCompleted");
    if (completedEl) completedEl.textContent = String(completed);
    const pendingEl = $id("dashCompletionGaugePending");
    if (pendingEl) pendingEl.textContent = String(pending);
  }
  renderPortfolioOverview() {
    const range = this.getOverviewDateRange();
    const periodSelect = $id("dashOverviewPeriodSelect");
    if (periodSelect && periodSelect.value !== this.overviewPeriod) {
      periodSelect.value = this.overviewPeriod;
      syncPaSelect(periodSelect);
    }
    this.setText("#dashOverviewProjects", this.countInRange(this.projects, "createdAt", range));
    this.setText("#dashOverviewTech", this.countInRange(this.technologies, "createdAt", range));
    this.setText("#dashOverviewMedia", this.countInRange(this.media, "uploadedAt", range));
    this.setText("#dashOverviewTesti", this.countInRange(this.testimonials, "createdAt", range));
  }
  formatActivityTime(iso) {
    try {
      const d = new Date(iso);
      if (Number.isNaN(d.getTime())) return "";
      const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      return `${date} \u2022 ${time}`;
    } catch {
      return "";
    }
  }
  renderProjectsOverTimeLine() {
    const card = $(".pa-line-chart-card");
    const container = card ? $(".pa-canvasjs-mount-line", card) : null;
    if (!container) return;
    const now = /* @__PURE__ */ new Date();
    const year = this.projectsYear || now.getFullYear();
    const isCurrentYear = year === now.getFullYear();
    const monthsCount = isCurrentYear ? now.getMonth() + 1 : 12;
    const monthly = [];
    for (let m = 0; m < monthsCount; m++) {
      const monthStart = new Date(year, m, 1);
      const monthEnd = new Date(year, m + 1, 1);
      const count = this.projects.filter((project) => {
        if (!project.createdAt) return false;
        const created = new Date(project.createdAt);
        if (Number.isNaN(created.getTime())) return false;
        return created >= monthStart && created < monthEnd;
      }).length;
      monthly.push({ label: MONTH_NAMES[m], y: count });
    }
    renderAreaChart(container, monthly, getAccentCssVar());
    const firstLabel = monthly[0]?.label || MONTH_NAMES[0];
    const lastLabel = monthly[monthly.length - 1]?.label || firstLabel;
    container.setAttribute("aria-label", `Projects added in ${year} from ${firstLabel} to ${lastLabel}`);
  }
  renderWeeklyActivityChart() {
    const card = $(".pa-multiline-chart-card");
    const container = card ? $(".pa-canvasjs-mount-multiline", card) : null;
    if (!container) return;
    const projCounts = new Array(7).fill(0);
    const mediaCounts = new Array(7).fill(0);
    const testiCounts = new Array(7).fill(0);
    this.projects.forEach((p) => {
      const i = mondayIndex(p.createdAt);
      if (i != null) projCounts[i]++;
    });
    this.media.forEach((m) => {
      const i = mondayIndex(m.uploadedAt);
      if (i != null) mediaCounts[i]++;
    });
    this.testimonials.forEach((t) => {
      const i = mondayIndex(t.createdAt);
      if (i != null) testiCounts[i]++;
    });
    const toPoints = (counts) => counts.map((y, i) => ({ label: DAY_NAMES[i], y }));
    const seriesDefs = [
      { name: "Projects", points: toPoints(projCounts) },
      { name: "Media", points: toPoints(mediaCounts) },
      { name: "Testimonials", points: toPoints(testiCounts) }
    ];
    const colors = assignSeriesColors(seriesDefs);
    renderMultiLineChart(container, seriesDefs.map((def, index) => ({
      ...def,
      color: colors[index]
    })));
  }
  renderRecentProjects() {
    const container = $id("dashRecentProjects");
    if (!container) return;
    const sorted = this.projects.slice().sort((a, b) => {
      const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (db !== da) return db - da;
      return (b.id || 0) - (a.id || 0);
    });
    const top = sorted.slice(0, 4);
    if (top.length === 0) {
      container.innerHTML = `<div class="pa-dash-recent-sub">No projects yet.</div>`;
      return;
    }
    container.innerHTML = top.map((p, i) => {
      const thumbClass = THUMB_CLASSES[i % THUMB_CLASSES.length];
      const icon = CATEGORY_ICONS[p.catKey] || DEFAULT_ICON;
      const catLabel = this.categoryMeta[p.catKey]?.label || CATEGORY_META_PROJECTS[p.catKey]?.label || p.catKey || "";
      const badgeClass = STATUS_BADGE_CLASS[p.status] || "draft";
      const meta = p.createdAt ? formatDate(p.createdAt) : "\u2014";
      const statusLabel = (p.status || "\u2014").toUpperCase();
      return `<div class="pa-dash-recent-project">
        <div class="pa-dash-recent-thumb ${thumbClass}">
          <div class="pa-dash-thumb-icon"><i class="${icon}"></i></div>
        </div>
        <div class="pa-dash-recent-info">
          <div class="pa-dash-recent-title">${escapeHtml(p.title || "Untitled")}</div>
          <div class="pa-dash-recent-sub">${escapeHtml(catLabel)}</div>
        </div>
        <span class="pa-dash-recent-badge ${badgeClass}">${escapeHtml(statusLabel)}</span>
        <div class="pa-dash-recent-meta">${escapeHtml(meta)}</div>
      </div>`;
    }).join("");
  }
  activityIcon(activity) {
    const action = activity?.metadata?.action;
    if (action && ACTIVITY_ACTION_ICONS[action]) return ACTIVITY_ACTION_ICONS[action];
    return ACTIVITY_TYPE_ICONS[activity?.type] || ACTIVITY_TYPE_ICONS.other;
  }
  renderRecentActivity() {
    const container = $id("dashRecentActivity");
    if (!container) return;
    const top = (this.recentActivities || []).slice(0, 5);
    if (top.length === 0) {
      container.className = "pa-dash-activity-timeline";
      container.innerHTML = `<div class="pa-dash-recent-sub">No recent activity yet.</div>`;
      return;
    }
    container.className = "pa-dash-activity-timeline";
    container.innerHTML = top.map((item, index) => {
      const dotClass = ACTIVITY_DOT_CLASSES[index % ACTIVITY_DOT_CLASSES.length];
      const time = escapeHtml(this.formatActivityTime(item.createdAt) || timeAgo(item.createdAt));
      const isLast = index === top.length - 1;
      const icon = this.activityIcon(item);
      const label = item.actionTitle || "Activity";
      const title = item.actionDescription || item.userName || "";
      return `<div class="pa-dash-activity-item${isLast ? " is-last" : ""}">
        <div class="pa-dash-activity-rail" aria-hidden="true">
          <span class="pa-dash-activity-dot ${dotClass}"></span>
          ${isLast ? "" : '<span class="pa-dash-activity-line"></span>'}
        </div>
        <div class="pa-dash-activity-icon-wrap"><i class="${icon}"></i></div>
        <div class="pa-dash-activity-body">
          <div class="pa-dash-activity-label">${escapeHtml(label)}</div>
          <div class="pa-dash-activity-title">${escapeHtml(title)}</div>
        </div>
        <div class="pa-dash-activity-time">${time}</div>
      </div>`;
    }).join("");
  }
  destroy() {
    if (this._chartWaitId) {
      cancelAnimationFrame(this._chartWaitId);
      this._chartWaitId = null;
    }
    document.querySelectorAll(".pa-donut-canvas, .pa-gauge-canvas, .pa-canvasjs-mount-line, .pa-canvasjs-mount-multiline").forEach((el) => destroyChart(el));
    super.destroy();
  }
};
export {
  DashboardModule
};
