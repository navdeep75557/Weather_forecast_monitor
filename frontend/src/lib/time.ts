/** Time-axis helpers. */

const DAY = 86_400_000;
const HOUR = 3_600_000;

/** Clean ticks for a [t0, t1] window: day boundaries for long spans, 6/3-hourly when zoomed. */
export function timeTicks(t0: number, t1: number, maxTicks = 8): number[] {
  const span = t1 - t0;
  const steps = [3 * HOUR, 6 * HOUR, 12 * HOUR, DAY, 2 * DAY, 4 * DAY, 7 * DAY];
  const step = steps.find((s) => span / s <= maxTicks) ?? 7 * DAY;
  // January/February are GMT, so UTC midnight == London midnight.
  const first = Math.ceil(t0 / step) * step;
  const ticks: number[] = [];
  for (let t = first; t <= t1; t += step) ticks.push(t);
  return ticks;
}
