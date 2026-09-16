/* Shared formatting helpers. */

const rmFmt = new Intl.NumberFormat("en-MY", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const intFmt = new Intl.NumberFormat("en-MY");

/** RM 1,234.56 */
export const rm = (n) => `RM ${rmFmt.format(Number(n) || 0)}`;

/** Unit costs and per-ringgit rates go below a sen, where 2dp would
 *  render RM 0.002 as "RM 0.00". Keeps significant digits instead. */
export function rmUnit(n) {
  const v = Number(n) || 0;
  if (v === 0) return "RM 0.00";
  if (Math.abs(v) >= 0.01) return `RM ${v.toFixed(Math.abs(v) >= 1 ? 2 : 3)}`;
  return `RM ${v.toFixed(4)}`;
}

/** Compact money for stat cards: RM 2.99M / RM 412.5K / RM 840 */
export function rmCompact(n) {
  const v = Number(n) || 0;
  const abs = Math.abs(v);
  if (abs >= 1e6) return `RM ${(v / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `RM ${(v / 1e3).toFixed(1)}K`;
  return `RM ${v.toFixed(0)}`;
}

/** Formatted currency helper for telephony & API costs, unified to RM. */
export function usd(n, symbol = "RM ") {
  const v = Number(n) || 0;
  const dp = v !== 0 && Math.abs(v) < 1 ? 4 : 2;
  return symbol + v.toFixed(dp);
}

export const num = (n) => intFmt.format(Number(n) || 0);

export const pct = (n, dp = 1) => `${((Number(n) || 0) * 100).toFixed(dp)}%`;

export function durationText(seconds) {
  if (!seconds) return "0:00";
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function minutesText(seconds) {
  const m = (Number(seconds) || 0) / 60;
  return m >= 100 ? `${Math.round(m)} min` : `${m.toFixed(1)} min`;
}

const dateFmt = new Intl.DateTimeFormat("en-MY", {
  year: "numeric", month: "short", day: "2-digit",
});
const timeFmt = new Intl.DateTimeFormat("en-MY", {
  hour: "2-digit", minute: "2-digit", second: "2-digit",
});

export const fmtDate = (d) => (d ? dateFmt.format(new Date(d)) : "—");
export const fmtTime = (d) => (d ? timeFmt.format(new Date(d)) : "—");

/** "3 min ago" / "in 2 hours" — relative to now. */
export function relativeTime(d) {
  if (!d) return "—";
  const then = new Date(d).getTime();
  if (Number.isNaN(then)) return "—";

  const secs = Math.round((then - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units = [
    ["year", 31536000], ["month", 2592000], ["day", 86400],
    ["hour", 3600], ["minute", 60], ["second", 1],
  ];

  for (const [unit, size] of units) {
    if (Math.abs(secs) >= size || unit === "second") {
      return rtf.format(Math.round(secs / size), unit);
    }
  }
  return "—";
}

/** "2026-W28" -> "W28" ; "2026-08" -> "Aug 2026" */
export function shortPeriod(p) {
  if (!p) return "";
  if (p.includes("W")) return p.split("-")[1];
  const [y, m] = p.split("-");
  if (!m) return p;
  return `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][+m - 1]} ${y}`;
}

/** Ageing bucket from days overdue — shared by geography and book position. */
export function ageingBucket(days) {
  if (days <= 30) return "0-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export const AGEING_BUCKETS = ["0-30", "31-60", "61-90", "90+"];

export function downloadCsv(filename, headers, rows) {
  const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const body = [headers.map(cell).join(",")]
    .concat(rows.map((r) => r.map(cell).join(",")))
    .join("\n");

  const blob = new Blob([body], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
