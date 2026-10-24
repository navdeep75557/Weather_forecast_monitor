/** Shared tooltip card: value leads, series name follows, keyed by a short line in the series colour. */

export interface TooltipRow {
  label: string;
  value: string;
  color?: string;
}

export function TooltipCard({ title, rows, note }: { title: string; rows: TooltipRow[]; note?: string }) {
  return (
    <div className="tooltip">
      <div className="tooltip-title">{title}</div>
      {rows.map((r) => (
        <div className="tooltip-row" key={r.label}>
          {r.color ? <span className="line-key" style={{ background: r.color }} /> : <span className="line-key blank" />}
          <strong>{r.value}</strong>
          <span className="muted">{r.label}</span>
        </div>
      ))}
      {note && <div className="tooltip-note">{note}</div>}
    </div>
  );
}
