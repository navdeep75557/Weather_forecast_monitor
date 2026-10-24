/** Wind Forecast Monitor dashboard. */
import { type ReactNode, useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { Controls } from "./components/Controls";
import { DailyTable } from "./components/DailyTable";
import { ErrorChart } from "./components/ErrorChart";
import { ForecastChart, mergeSeries } from "./components/ForecastChart";
import { HorizonChart } from "./components/HorizonChart";
import { Insights } from "./components/Insights";
import { MetricCards } from "./components/MetricCards";
import { fmtDay } from "./lib/format";
import type { HealthResponse, Query } from "./types";
import { useDashboard, useDebounced } from "./useDashboard";

const DEFAULT_QUERY: Query = {
  start: "2026-01-01",
  end: "2026-01-31",
  mode: "cutoff",
  cutoffHour: 9,
  cutoffMinute: 50,
  horizonHours: 24,
};

function Card({ title, subtitle, children, actions }: { title: string; subtitle?: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <section className="card">
      <header className="card-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p className="card-sub">{subtitle}</p>}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

export default function App() {
  const [query, setQuery] = useState<Query>(DEFAULT_QUERY);
  const debounced = useDebounced(query, 300);
  const { data, loading, slow, error, retry } = useDashboard(debounced);
  const [health, setHealth] = useState<HealthResponse | null>(null);

  useEffect(() => {
    api.health().then(setHealth, () => setHealth(null));
  }, [data]);

  const rows = useMemo(() => (data ? mergeSeries(data.actuals, data.metrics.points) : []), [data]);
  const [range, setRange] = useState<[number, number] | null>(null);
  const [chartKey, setChartKey] = useState(0);
  useEffect(() => setRange(null), [rows]);

  const full: [number, number] = [0, Math.max(rows.length - 1, 0)];
  const idx = range ?? full;
  const zoomed = idx[0] !== full[0] || idx[1] !== full[1];
  const timeWindow: [number, number] = rows.length ? [rows[idx[0]].t, rows[idx[1]].t] : [0, 0];
  const resetZoom = () => {
    setRange(null);
    setChartKey((k) => k + 1);
  };

  const usedRange = useMemo<[number, number] | null>(() => {
    const h = data?.metrics.points.map((p) => p.horizon_hours) ?? [];
    return h.length ? [Math.min(...h), Math.max(...h)] : null;
  }, [data]);

  const m = data?.metrics;
  const fileTag = m ? `${m.params.start}_${m.params.end}_${m.params.mode === "cutoff" ? `cutoff-${String(m.params.cutoff_hour).padStart(2, "0")}${String(m.params.cutoff_minute).padStart(2, "0")}` : `h${m.params.horizon_hours}`}` : "";

  return (
    <div className="page">
      <header className="app-header">
        <div>
          <h1>Wind Forecast Monitor</h1>
          <p className="subtitle">
            GB wind generation: day-ahead forecast vs outturn · Elexon BMRS (WINDFOR, FUELHH) · January 2026 · times in UK local time
          </p>
        </div>
        <div className={`status-pill ${health?.status === "ok" ? "ok" : health ? "warn" : ""}`} role="status">
          <span className="dot" aria-hidden />
          {health
            ? health.status === "ok"
              ? `Data loaded · ${health.forecast_runs} forecast runs`
              : "Data unavailable"
            : "Connecting…"}
        </div>
      </header>

      <Controls query={query} onChange={setQuery} />

      {error && (
        <div className="banner error" role="alert">
          <span>{error}</span>
          <button className="button" onClick={retry}>
            Retry
          </button>
        </div>
      )}

      {!data && !error && (
        <div className="loading-state" role="status">
          <div className="spinner" aria-hidden />
          <p>{slow ? "Waking up the API. Free-tier hosting can take 30–60 seconds on first request…" : "Loading Elexon data…"}</p>
        </div>
      )}

      {data && m && (
        <main className={`content ${loading ? "is-refreshing" : ""}`} aria-busy={loading}>
          <MetricCards metrics={m} />

          <Card
            title="Actual vs forecast wind generation"
            subtitle="Drag the handles under the chart to zoom; the error chart below follows."
            actions={
              zoomed ? (
                <div className="card-actions">
                  <span className="zoom-range">
                    {fmtDay(timeWindow[0])} – {fmtDay(timeWindow[1])}
                  </span>
                  <button className="button ghost" onClick={resetZoom}>
                    Reset zoom
                  </button>
                </div>
              ) : undefined
            }
          >
            <ForecastChart key={chartKey} rows={rows} range={idx} onRangeChange={setRange} forecastLabel={m.params.label} />
          </Card>

          <Card title="Forecast error over time" subtitle="Error = forecast − actual, hourly. Above zero means the forecast was too high.">
            <ErrorChart points={m.points} window={timeWindow} />
          </Card>

          <div className="two-col">
            <Card
              title="Error by forecast lead time"
              subtitle="MAE of every published forecast run for the selected dates, by hours between publish and delivery."
            >
              <HorizonChart buckets={data.horizon.buckets} usedRange={usedRange} />
            </Card>
            <Card title="Key insights" subtitle={`For ${m.params.label}, ${m.params.start} to ${m.params.end}`}>
              <Insights items={m.insights} />
            </Card>
          </div>

          <Card title="Day-by-day accuracy" subtitle="Click a column to sort. Bar under MAE shows the day's MAE relative to the worst day.">
            <DailyTable daily={m.daily} points={m.points} fileTag={fileTag} />
          </Card>
        </main>
      )}

      <footer className="footer">
        Data: Elexon BMRS Insights API (FUELHH fuelType=WIND, WINDFOR). Forecasts are hourly; metrics use hours where both forecast
        and actual exist. Error = forecast − actual.
      </footer>
    </div>
  );
}
