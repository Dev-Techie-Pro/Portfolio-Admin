import { $id } from "./dom.js";
function countInMonth(records, monthOffset = 0, dateField = "createdAt") {
  const now = /* @__PURE__ */ new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + monthOffset + 1, 1);
  return records.filter((r) => {
    const raw = r[dateField];
    const t = raw ? new Date(raw).getTime() : NaN;
    return !Number.isNaN(t) && t >= start.getTime() && t < end.getTime();
  }).length;
}
function setStatTrend(elId, records, predicate, dateField = "createdAt") {
  const el = $id(elId);
  if (!el) return;
  const filtered = predicate ? records.filter(predicate) : records;
  const current = countInMonth(filtered, 0, dateField);
  const previous = countInMonth(filtered, -1, dateField);
  let pct = 0;
  if (previous > 0) pct = Math.round((current - previous) / previous * 100);
  else if (current > 0) pct = 100;
  if (pct > 0) {
    el.className = "pa-dash-stat-change up";
    el.innerHTML = `<i class="ri-arrow-up-line"></i> +${pct}%`;
  } else if (pct < 0) {
    el.className = "pa-dash-stat-change down";
    el.innerHTML = `<i class="ri-arrow-down-line"></i> ${pct}%`;
  } else {
    el.className = "pa-dash-stat-change neutral";
    el.innerHTML = `<i class="ri-subtract-line"></i> 0%`;
  }
}
function setStatValue(id, value) {
  const el = $id(id);
  if (el) el.textContent = value;
}
export {
  countInMonth,
  setStatTrend,
  setStatValue
};
