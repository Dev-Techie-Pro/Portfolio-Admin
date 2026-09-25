const chartInstances = /* @__PURE__ */ new WeakMap();
let apexChartsLoadPromise = null;
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
const ACCENT_OPACITIES = [1, 0.82, 0.64, 0.46, 0.32, 0.22];
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
function getAccentRgb() {
  const rgb = getComputedStyle(document.documentElement).getPropertyValue("--pa-orange-rgb").trim();
  if (rgb) return rgb;
  const resolved = resolveChartColor(getAccentCssVar());
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(resolved);
  if (!match) return "255, 102, 0";
  return `${parseInt(match[1], 16)}, ${parseInt(match[2], 16)}, ${parseInt(match[3], 16)}`;
}
function getAccentColor() {
  return resolveChartColor(getAccentCssVar());
}
const CHART_SUPPORT_COLORS = [
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
function getChartColorPalette(count = 5, { accentFirst = true } = {}) {
  const colors = [];
  for (let i = 0; i < count; i += 1) {
    if (accentFirst && i === 0) {
      colors.push(getAccentCssVar());
    } else {
      const supportIndex = accentFirst ? i - 1 : i;
      colors.push(CHART_SUPPORT_COLORS[supportIndex % CHART_SUPPORT_COLORS.length]);
    }
  }
  return colors;
}
function getAccentPalette(count = 5) {
  const rgb = getAccentRgb();
  const base = getAccentColor();
  if (count <= 1) return [base];
  return Array.from({ length: count }, (_, index) => {
    const alpha = ACCENT_OPACITIES[index % ACCENT_OPACITIES.length];
    return alpha >= 0.999 ? base : `rgba(${rgb}, ${alpha})`;
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
function renderGaugeChart(mountEl, pct, fillColor = "var(--pa-green)", options = {}) {
  if (!mountEl) return null;
  const value = Math.max(0, Math.min(100, pct));
  const colors = themeColors();
  const {
    height = 236,
    hollowSize = "74%",
    trackColor = colors.borderSoft
  } = options;
  return mountChart(mountEl, {
    chart: {
      type: "radialBar",
      height,
      background: "transparent",
      fontFamily: "inherit",
      toolbar: { show: false },
      animations: { enabled: true, easing: "easeinout", speed: 700 },
      sparkline: { enabled: false }
    },
    series: [value],
    colors: [resolveChartColor(fillColor)],
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        hollow: {
          size: hollowSize,
          background: "transparent"
        },
        track: {
          background: trackColor,
          strokeWidth: "100%",
          margin: 0
        },
        dataLabels: {
          show: false
        }
      }
    },
    stroke: { lineCap: "round" },
    tooltip: { enabled: false }
  });
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
export {
  CHART_SUPPORT_COLORS,
  assignSegmentColors,
  assignSeriesColors,
  destroyChart,
  ensureApexChartsLoaded,
  getAccentColor,
  getAccentCssVar,
  getAccentPalette,
  getAccentRgb,
  getChartColorPalette,
  renderAreaChart,
  renderDonutChart,
  renderGaugeChart,
  renderMultiLineChart,
  renderProjGaugeChart,
  resolveChartColor
};
