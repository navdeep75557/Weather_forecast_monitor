/** HTML legend whose keys mirror the mark: a line for lines, a swatch for bars/areas. */

export interface LegendItem {
  label: string;
  color: string;
  shape?: "line" | "rect";
}

export function Legend({ items }: { items: LegendItem[] }) {
  return (
    <ul className="legend" aria-label="Legend">
      {items.map((i) => (
        <li key={i.label}>
          <span className={i.shape === "rect" ? "swatch" : "line-key"} style={{ background: i.color }} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
