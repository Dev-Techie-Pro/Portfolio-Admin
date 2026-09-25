function deriveDataUrlSize(url) {
  if (typeof url !== "string" || !url.startsWith("data:")) return 0;
  const comma = url.indexOf(",");
  if (comma === -1) return 0;
  const payload = url.slice(comma + 1);
  return payload ? Math.floor(payload.length * 3 / 4) : 0;
}
function formatFileSize(bytes, url) {
  let size = bytes;
  if (!size && url) size = deriveDataUrlSize(url);
  if (!size || size <= 0) return "Unknown size";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let val = size;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
function formatDate(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "Unknown";
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "Unknown";
  }
}
function formatMonthYear(ym) {
  if (!ym) return "";
  const [y, m] = ym.split("-").map(Number);
  if (!y || !m) return ym;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}
function timeAgo(iso) {
  try {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return "";
    const diffMs = Date.now() - then;
    if (diffMs < 0) return formatDate(iso);
    const mins = Math.floor(diffMs / 6e4);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 5) return `${weeks}w ago`;
    return formatDate(iso);
  } catch {
    return "";
  }
}
function parseYearsInput(raw) {
  const trimmed = (raw || "").trim();
  if (trimmed === "") return null;
  const n = parseFloat(trimmed);
  return Number.isNaN(n) ? null : n;
}
function parseSortInput(raw, fallback) {
  const trimmed = (raw || "").trim();
  if (trimmed === "") return fallback;
  const n = parseInt(trimmed, 10);
  return Number.isNaN(n) ? fallback : n;
}
function toTimestamp(value) {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}
function sortByNewestFirst(records, field = "createdAt") {
  return records.slice().sort((a, b) => toTimestamp(b[field]) - toTimestamp(a[field]));
}
function csvEscapeField(val) {
  const str = val == null ? "" : String(val);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}
export {
  csvEscapeField,
  formatDate,
  formatFileSize,
  formatMonthYear,
  parseSortInput,
  parseYearsInput,
  sortByNewestFirst,
  timeAgo,
  toTimestamp
};
