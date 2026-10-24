/** Day-by-day metrics table (sortable) with CSV export of daily and hourly data. */
import { useMemo, useState } from "react";
import { downloadCSV, toCSV } from "../lib/csv";
import { fmtDateLong, fmtNum, fmtPct, fmtSignedMW } from "../lib/format";
import type { DailyMetrics, JoinedPoint } from "../types";

type Key = "date" | "n" | "mae" | "rmse" | "bias" | "mape" | "p90_abs_error" | "mean_actual" | "mean_forecast";

const COLUMNS: { key: Key; label: string; fmt: (d: DailyMetrics) => string }[] = [
  { key: "date", label: "Date", fmt: (d) => fmtDateLong(d.date) },
  { key: "n", label: "Hours", fmt: (d) => fmtNum(d.n) },
  { key: "mae", label: "MAE (MW)", fmt: (d) => fmtNum(d.mae) },
  { key: "rmse", label: "RMSE (MW)", fmt: (d) => fmtNum(d.rmse) },
  { key: "bias", label: "Bias (MW)", fmt: (d) => fmtSignedMW(d.bias).replace(" MW", "") },
  { key: "mape", label: "MAPE", fmt: (d) => fmtPct(d.mape) },
  { key: "p90_abs_error", label: "P90 |err| (MW)", fmt: (d) => fmtNum(d.p90_abs_error) },
  { key: "mean_actual", label: "Mean actual (MW)", fmt: (d) => fmtNum(d.mean_actual) },
  { key: "mean_forecast", label: "Mean forecast (MW)", fmt: (d) => fmtNum(d.mean_forecast) },
];

export function DailyTable({ daily, points, fileTag }: { daily: DailyMetrics[]; points: JoinedPoint[]; fileTag: string }) {
  const [sort, setSort] = useState<{ key: Key; desc: boolean }>({ key: "date", desc: false });
  const maxMae = Math.max(...daily.map((d) => d.mae ?? 0), 1);

  const rows = useMemo(() => {
    const out = [...daily];
    out.sort((a, b) => {
      const av = (a[sort.key] ?? -Infinity) as number;
      const bv = (b[sort.key] ?? -Infinity) as number;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sort.desc ? -cmp : cmp;
    });
    return out;
  }, [daily, sort]);

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
    <>
      <div className="table-actions">
        <button className="button" onClick={exportDaily}>
          Export daily CSV
        </button>
        <button className="button ghost" onClick={exportHourly}>
          Export hourly CSV
        </button>
      </div>
      <div className="table-wrap" tabIndex={0} aria-label="Daily metrics table">
        <table>
          <thead>
            <tr>
              {COLUMNS.map((c) => (
                <th key={c.key} aria-sort={sort.key === c.key ? (sort.desc ? "descending" : "ascending") : "none"}>
                  <button onClick={() => setSort((s) => ({ key: c.key, desc: s.key === c.key ? !s.desc : c.key !== "date" }))}>
                    {c.label}
                    <span className="sort-ind" aria-hidden>
                      {sort.key === c.key ? (sort.desc ? "▾" : "▴") : ""}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.date}>
                {COLUMNS.map((c) => (
                  <td key={c.key}>
                    {c.fmt(d)}
                    {c.key === "mae" && d.mae != null && (
                      <span className="cell-bar" style={{ width: `${(d.mae / maxMae) * 100}%` }} aria-hidden />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
