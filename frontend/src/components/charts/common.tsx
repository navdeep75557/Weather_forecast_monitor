/** Shared chart chrome: axis styling, legend and tooltip card. Colours come from CSS tokens so themes just work. */
import { useEffect, useState } from "react";

export const AXIS = {
  stroke: "var(--axis)",
  tick: { fill: "var(--fg-3)", fontSize: 12 },
  tickLine: false,
} as const;

export const Y_LABEL = { value: "MW", position: "top", offset: 12, fill: "var(--fg-3)", fontSize: 12 } as const;

/** True below the given width; used to thin ticks on phones. */
export function useNarrow(maxWidth = 640): boolean {
  const query = `(max-width: ${maxWidth}px)`;
  const [narrow, setNarrow] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return narrow;
}

export interface LegendItem {
  label: string;
  color: string;
  shape: "line" | "swatch";
}

/** HTML legend; keys mirror the mark (line for lines, swatch for fills). */
export function ChartLegend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-2" aria-label="Legend">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span
            aria-hidden
            className={i.shape === "line" ? "h-0.5 w-4 rounded-full" : "size-3 rounded-sm opacity-40"}
            style={{ backgroundColor: i.color }}
          />
          {i.label}
        </li>
      ))}
    </ul>
  );
}

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

/** Tooltip body: value leads, label follows, keyed by a short line in the series colour. */
export function TooltipCard({ title, rows, note }: { title: string; rows: TooltipRow[]; note?: string }) {
  return (
    <div className="min-w-48 rounded-lg border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-fg-2">{title}</p>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-2 py-0.5">
          <span aria-hidden className="h-0.5 w-3 rounded-full" style={{ backgroundColor: r.color ?? "transparent" }} />
          <span className="font-semibold text-fg tabular-nums">{r.value}</span>
          <span className="text-fg-3">{r.label}</span>
        </div>
      ))}
      {note && <p className="mt-1 max-w-64 text-fg-3">{note}</p>}
    </div>
  );
}
