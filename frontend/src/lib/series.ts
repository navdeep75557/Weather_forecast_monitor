/** Chart-ready series derived from API responses (kept out of the lazy chart chunk). */
import type { ActualPoint, JoinedPoint } from "../types";

export interface SeriesRow {
  t: number;
  actual: number | null;
  forecast: number | null;
  publish?: number;
  horizon?: number;
  /** [low, high] band where the forecast is above the actual (else a zero-height band). */
  overBand: [number, number] | null;
  /** [low, high] band where the forecast is below the actual (else a zero-height band). */
  underBand: [number, number] | null;
}

/** Merge half-hourly actuals with hourly forecasts on the timestamp, adding error bands at forecast hours. */
export function mergeSeries(actuals: ActualPoint[], points: JoinedPoint[]): SeriesRow[] {
  const rows = new Map<number, SeriesRow>();
  for (const a of actuals) {
    const t = Date.parse(a.start_time);
    rows.set(t, { t, actual: a.actual_mw, forecast: null, overBand: null, underBand: null });
  }
  for (const p of points) {
    const t = Date.parse(p.start_time);
    const row = rows.get(t) ?? { t, actual: null, forecast: null, overBand: null, underBand: null };
    row.forecast = p.forecast_mw;
    row.publish = Date.parse(p.publish_time);
    row.horizon = p.horizon_hours;
    const a = p.actual_mw;
    const f = p.forecast_mw;
    row.overBand = f >= a ? [a, f] : [a, a];
    row.underBand = f < a ? [f, a] : [a, a];
    rows.set(t, row);
  }
  return [...rows.values()].sort((a, b) => a.t - b.t);
}
