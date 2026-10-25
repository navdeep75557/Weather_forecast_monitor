/** Number/time formatting. Times are shown in Europe/London (the market's clock); MW always carries its unit. */

const TZ = "Europe/London";

const dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "2-digit", month: "short" });
const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const fullFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  weekday: "short",
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});
const int = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const oneDp = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const fmtDay = (t: number) => dayFmt.format(t);
export const fmtTime = (t: number) => timeFmt.format(t);
export const fmtDateTime = (t: number) => fullFmt.format(t);

/** Axis tick: date when the visible span is long, date + time when zoomed in. */
export const tickFormatter = (spanMs: number) => (t: number) =>
  spanMs > 2 * 86_400_000 ? fmtDay(t) : `${fmtDay(t)} ${fmtTime(t)}`;

/** Thousands-separated integer, no unit (for KPI values and table cells that show the unit elsewhere). */
export const fmtNum = (v: number | null | undefined) => (v == null ? "–" : int.format(v));
export const fmtMW = (v: number | null | undefined) => (v == null ? "–" : `${int.format(v)} MW`);
export const fmtSigned = (v: number | null | undefined) =>
  v == null ? "–" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${int.format(Math.abs(v))}`;
export const fmtSignedMW = (v: number | null | undefined) => (v == null ? "–" : `${fmtSigned(v)} MW`);
export const fmtPct = (v: number | null | undefined) => (v == null ? "–" : `${oneDp.format(v)}%`);
export const fmtHours = (v: number | null | undefined) => (v == null ? "–" : `${oneDp.format(v)} h`);

/** Calendar date from a YYYY-MM-DD string, e.g. "Thu 01 Jan". */
export const fmtDateLong = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "short" }).format(
    new Date(`${iso}T00:00:00Z`),
  );

const dayMonth = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });

/** "1–7 Jan 2026", "2 Jan – 1 Feb 2026" or "9 Jan 2026" for a range of YYYY-MM-DD dates in 2026. */
export function fmtRange(start: string, end: string): string {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  if (start === end) return `${dayMonth.format(s)} 2026`;
  if (start.slice(0, 7) === end.slice(0, 7)) return `${s.getUTCDate()}–${dayMonth.format(e)} 2026`;
  return `${dayMonth.format(s)} – ${dayMonth.format(e)} 2026`;
}

/** "3 min ago" style relative time. */
export function fmtAgo(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  return hrs < 48 ? `${hrs} h ago` : `${Math.round(hrs / 24)} days ago`;
}
