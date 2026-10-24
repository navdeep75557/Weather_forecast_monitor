/** Day-by-day metrics: sortable, sticky header, heat-shaded error cells, CSV export. */
import { ArrowDown, ArrowUp, ArrowUpDown, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { cn } from "../lib/cn";
import { downloadCSV, toCSV } from "../lib/csv";
import { fmtDateLong, fmtNum, fmtPct, fmtSigned } from "../lib/format";
import type { DailyMetrics, JoinedPoint } from "../types";
import { Button } from "./ui/Button";
import { Card, CardBody, CardHeader } from "./ui/Card";

type Key = "date" | "n" | "mae" | "rmse" | "bias" | "mape" | "p90_abs_error" | "mean_actual" | "mean_forecast";
type Heat = "magnitude" | "direction" | null;

const COLUMNS: { key: Key; label: string; heat: Heat; fmt: (d: DailyMetrics) => string }[] = [
  { key: "date", label: "Date", heat: null, fmt: (d) => fmtDateLong(d.date) },
  { key: "mae", label: "MAE (MW)", heat: "magnitude", fmt: (d) => fmtNum(d.mae) },
  { key: "rmse", label: "RMSE (MW)", heat: "magnitude", fmt: (d) => fmtNum(d.rmse) },
  { key: "bias", label: "Bias (MW)", heat: "direction", fmt: (d) => fmtSigned(d.bias) },
  { key: "mape", label: "MAPE", heat: "magnitude", fmt: (d) => fmtPct(d.mape) },
  { key: "p90_abs_error", label: "P90 error (MW)", heat: "magnitude", fmt: (d) => fmtNum(d.p90_abs_error) },
  { key: "mean_actual", label: "Mean actual (MW)", heat: null, fmt: (d) => fmtNum(d.mean_actual) },
  { key: "mean_forecast", label: "Mean forecast (MW)", heat: null, fmt: (d) => fmtNum(d.mean_forecast) },
  { key: "n", label: "Hours", heat: null, fmt: (d) => fmtNum(d.n) },
];

/** Background tint: 6-34% of the heat colour, so ink text keeps AA contrast in both themes. */
function tint(color: string, ratio: number): string {
  return `color-mix(in srgb, ${color} ${Math.round(6 + 28 * Math.min(Math.max(ratio, 0), 1))}%, transparent)`;
}

interface Props {
  daily: DailyMetrics[];
  points: JoinedPoint[];
  fileTag: string;
}

export function DailyTable({ daily, points, fileTag }: Props) {
  const [sort, setSort] = useState<{ key: Key; desc: boolean }>({ key: "date", desc: false });

  const max = useMemo(() => {
    const out: Partial<Record<Key, number>> = {};
    for (const c of COLUMNS) if (c.heat) out[c.key] = Math.max(1e-9, ...daily.map((d) => Math.abs((d[c.key] as number | null) ?? 0)));
    return out;
  }, [daily]);

  const rows = useMemo(
    () =>
      [...daily].sort((a, b) => {
        const av = (a[sort.key] ?? -Infinity) as number;
        const bv = (b[sort.key] ?? -Infinity) as number;
        const cmp = av < bv ? -1 : av > bv ? 1 : 0;
        return sort.desc ? -cmp : cmp;
      }),
    [daily, sort],
  );

  const cellStyle = (key: Key, heat: Heat, d: DailyMetrics) => {
    const v = d[key] as number | null;
    if (!heat || v == null) return undefined;
    const ratio = Math.abs(v) / (max[key] ?? 1);
    const color = heat === "magnitude" ? "var(--heat)" : v >= 0 ? "var(--over)" : "var(--under)";
    return { backgroundColor: tint(color, ratio) };
  };

  const exportDaily = () =>
    downloadCSV(
      `daily-metrics-${fileTag}.csv`,
      toCSV(
        ["date", "hours", "mae_mw", "rmse_mw", "bias_mw", "mape_pct", "p90_abs_error_mw", "max_abs_error_mw", "mean_actual_mw", "mean_forecast_mw"],
        daily.map((d) => [d.date, d.n, d.mae, d.rmse, d.bias, d.mape, d.p90_abs_error, d.max_abs_error, d.mean_actual, d.mean_forecast]),
      ),
    );
  const exportHourly = () =>
    downloadCSV(
      `hourly-forecast-vs-actual-${fileTag}.csv`,
      toCSV(
        ["start_time_utc", "publish_time_utc", "horizon_hours", "forecast_mw", "actual_mw", "error_mw"],
        points.map((p) => [p.start_time, p.publish_time, p.horizon_hours, p.forecast_mw, p.actual_mw, p.error_mw]),
      ),
    );

  return (
    <Card aria-labelledby="daily-title">
      <CardHeader
        id="daily-title"
        title="Day-by-day accuracy"
        description="Click a column header to sort. Darker shading means a larger error."
        actions={
          <>
            <Button variant="ghost" onClick={exportHourly}>
              <Download aria-hidden />
              Hourly CSV
            </Button>
            <Button variant="primary" onClick={exportDaily}>
              <Download aria-hidden />
              Export CSV
            </Button>
          </>
        }
      />
      <CardBody>
        <div className="max-h-[30rem] overflow-auto rounded-lg border border-border" tabIndex={0} role="region" aria-label="Daily metrics table, scrollable">
          <table className="w-full border-separate border-spacing-0 text-sm tabular-nums">
            <thead>
              <tr>
                {COLUMNS.map((c, i) => {
                  const active = sort.key === c.key;
                  const Icon = !active ? ArrowUpDown : sort.desc ? ArrowDown : ArrowUp;
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      aria-sort={active ? (sort.desc ? "descending" : "ascending") : "none"}
                      className={cn(
                        "sticky top-0 z-10 border-b border-border bg-surface-2 px-3 py-2 font-medium whitespace-nowrap text-fg-2",
                        i === 0 ? "left-0 z-20 text-left" : "text-right",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setSort((s) => ({ key: c.key, desc: s.key === c.key ? !s.desc : c.key !== "date" }))}
                        className={cn("inline-flex cursor-pointer items-center gap-1 rounded hover:text-fg", i > 0 && "flex-row-reverse")}
                      >
                        {c.label}
                        <Icon aria-hidden className={cn("size-3.5", active ? "text-fg" : "text-fg-3")} />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.date} className="group">
                  {COLUMNS.map((c, i) =>
                    i === 0 ? (
                      <th
                        key={c.key}
                        scope="row"
                        className="sticky left-0 z-[5] border-b border-border bg-surface px-3 py-2 text-left font-medium whitespace-nowrap group-hover:bg-surface-2"
                      >
                        {c.fmt(d)}
                      </th>
                    ) : (
                      <td key={c.key} style={cellStyle(c.key, c.heat, d)} className="border-b border-border px-3 py-2 text-right whitespace-nowrap">
                        {c.fmt(d)}
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-3" aria-label="Table shading legend">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-sm bg-heat/30" />
            Error size (MAE, RMSE, MAPE, P90)
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-sm bg-over/30" />
            Bias: forecast too high
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="size-3 rounded-sm bg-under/30" />
            Bias: forecast too low
          </li>
        </ul>
      </CardBody>
    </Card>
  );
}
