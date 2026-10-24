/** Number/time formatting. All times are shown in Europe/London (the market's clock). */

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

export const fmtDay = (t: number) => dayFmt.format(t);
export const fmtTime = (t: number) => timeFmt.format(t);
export const fmtDateTime = (t: number) => fullFmt.format(t);

/** Axis tick: date when the visible span is long, time-of-day when zoomed in. */
export const tickFormatter = (spanMs: number) => (t: number) =>
  spanMs > 2 * 86_400_000 ? fmtDay(t) : `${fmtDay(t)} ${fmtTime(t)}`;

export const fmtMW = (v: number | null | undefined) => (v == null ? "–" : `${int.format(v)} MW`);
export const fmtSignedMW = (v: number | null | undefined) =>
  v == null ? "–" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${int.format(Math.abs(v))} MW`;
export const fmtPct = (v: number | null | undefined, digits = 1) => (v == null ? "–" : `${v.toFixed(digits)}%`);
export const fmtNum = (v: number | null | undefined) => (v == null ? "–" : int.format(v));

/** Compact axis label: 0 / 5K / 10K. */
export const fmtCompact = (v: number) => (Math.abs(v) >= 1000 ? `${+(v / 1000).toFixed(1)}K` : `${v}`);

export const fmtDateLong = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short", day: "2-digit", month: "short" }).format(
    new Date(`${iso}T00:00:00Z`),
  );
