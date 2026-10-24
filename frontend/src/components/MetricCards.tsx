/** Headline accuracy tiles for the current selection. */
import { fmtMW, fmtNum, fmtPct, fmtSignedMW } from "../lib/format";
import type { MetricsResponse } from "../types";

interface Tile {
  label: string;
  value: string;
  note: string;
}

export function MetricCards({ metrics }: { metrics: MetricsResponse }) {
  const m = metrics.overall;
  const mean = m.mean_actual ?? 0;
  const share = (v: number | null) => (v != null && mean ? `${((v / mean) * 100).toFixed(0)}% of mean output` : "");
  const tiles: Tile[] = [
    { label: "MAE", value: fmtMW(m.mae), note: `Typical miss · ${share(m.mae)}` },
    { label: "RMSE", value: fmtMW(m.rmse), note: "Penalises large misses" },
    {
      label: "Bias (mean error)",
      value: fmtSignedMW(m.bias),
      note: m.bias == null ? "" : m.bias > 0 ? "Forecast too high on average" : "Forecast too low on average",
    },
    { label: "MAPE", value: fmtPct(m.mape), note: "Mean % error vs actual" },
    { label: "P90 absolute error", value: fmtMW(m.p90_abs_error), note: "9 in 10 hours miss by less" },
  ];
  const c = metrics.coverage;
  return (
    <section aria-label="Accuracy metrics">
      <div className="tiles">
        {tiles.map((t) => (
          <div className="tile" key={t.label}>
            <div className="tile-label">{t.label}</div>
            <div className="tile-value">{t.value}</div>
            <div className="tile-note">{t.note}</div>
          </div>
        ))}
      </div>
      <p className="context-line">
        {fmtNum(m.n)} hourly forecast–actual pairs · {metrics.params.label} · mean actual {fmtMW(m.mean_actual)} · mean
        forecast {fmtMW(m.mean_forecast)}
        {c.with_forecast < c.target_hours && ` · ${fmtNum(c.target_hours - c.with_forecast)} target hours had no eligible forecast`}
      </p>
    </section>
  );
}
