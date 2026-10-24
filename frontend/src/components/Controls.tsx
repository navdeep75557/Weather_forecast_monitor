/** Filter row: target date range (January 2026), selection mode, cutoff time / horizon. */
import type { Query } from "../types";

export const MIN_DATE = "2026-01-01";
export const MAX_DATE = "2026-01-31";

const PRESETS: { label: string; start: string; end: string }[] = [
  { label: "Full month", start: MIN_DATE, end: MAX_DATE },
  { label: "1–7 Jan", start: "2026-01-01", end: "2026-01-07" },
  { label: "8–14 Jan", start: "2026-01-08", end: "2026-01-14" },
  { label: "15–21 Jan", start: "2026-01-15", end: "2026-01-21" },
  { label: "22–31 Jan", start: "2026-01-22", end: "2026-01-31" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const clampDate = (d: string) => (d < MIN_DATE ? MIN_DATE : d > MAX_DATE ? MAX_DATE : d);

export function Controls({ query, onChange }: { query: Query; onChange: (q: Query) => void }) {
  const set = (patch: Partial<Query>) => onChange({ ...query, ...patch });

  const setStart = (v: string) => {
    if (!v) return;
    const start = clampDate(v);
    set({ start, end: query.end < start ? start : query.end });
  };
  const setEnd = (v: string) => {
    if (!v) return;
    const end = clampDate(v);
    set({ end, start: query.start > end ? end : query.start });
  };
  const setCutoff = (v: string) => {
    const m = /^(\d{2}):(\d{2})/.exec(v);
    if (m) set({ cutoffHour: Number(m[1]), cutoffMinute: Number(m[2]) });
  };

  return (
    <section className="filters" aria-label="Filters">
      <div className="filter-group">
        <span className="filter-label" id="dates-label">Target dates</span>
        <div className="chips" role="group" aria-labelledby="dates-label">
          {PRESETS.map((p) => {
            const on = p.start === query.start && p.end === query.end;
            return (
              <button key={p.label} className="chip" aria-pressed={on} onClick={() => set({ start: p.start, end: p.end })}>
                {p.label}
              </button>
            );
          })}
        </div>
        <div className="date-inputs">
          <input type="date" aria-label="Start date" min={MIN_DATE} max={MAX_DATE} value={query.start} onChange={(e) => setStart(e.target.value)} />
          <span className="muted">to</span>
          <input type="date" aria-label="End date" min={MIN_DATE} max={MAX_DATE} value={query.end} onChange={(e) => setEnd(e.target.value)} />
        </div>
      </div>

      <div className="filter-group">
        <span className="filter-label" id="mode-label">Forecast used</span>
        <div className="segmented" role="radiogroup" aria-labelledby="mode-label">
          <button role="radio" aria-checked={query.mode === "cutoff"} onClick={() => set({ mode: "cutoff" })}>
            D-1 decision cutoff
          </button>
          <button role="radio" aria-checked={query.mode === "horizon"} onClick={() => set({ mode: "horizon" })}>
            Fixed horizon
          </button>
        </div>
        {query.mode === "cutoff" ? (
          <label className="inline-field">
            <span>Cutoff (London time, day before delivery)</span>
            <input type="time" step={600} value={`${pad(query.cutoffHour)}:${pad(query.cutoffMinute)}`} onChange={(e) => setCutoff(e.target.value)} />
          </label>
        ) : (
          <label className="inline-field">
            <span>
              Published at least <strong>{query.horizonHours}h</strong> before delivery
            </span>
            <input type="range" min={0} max={48} step={1} value={query.horizonHours} onChange={(e) => set({ horizonHours: Number(e.target.value) })} />
          </label>
        )}
      </div>
    </section>
  );
}
