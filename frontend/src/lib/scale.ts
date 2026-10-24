/** Round-number axis ticks (steps of 1, 2, 2.5 or 5 × 10^k). */
export function niceTicks(lo: number, hi: number, maxTicks = 6): number[] {
  if (!(hi > lo)) return [lo];
  const raw = (hi - lo) / (maxTicks - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag;
  const ticks: number[] = [];
  for (let t = Math.floor(lo / step) * step; t <= Math.ceil(hi / step) * step + step / 2; t += step) ticks.push(t);
  return ticks;
}
