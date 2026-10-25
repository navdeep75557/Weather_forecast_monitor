/** Wind Forecast Monitor dashboard: composes filters, KPIs, charts, insights and the daily table. */
import { ZoomOut } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { DailyTable } from "./components/DailyTable";
import { FilterBar } from "./components/FilterBar";
import { Guide } from "./components/Guide";
import { InsightsPanel } from "./components/InsightsPanel";
import { KpiRow } from "./components/KpiRow";
import { ChartSkeleton, DashboardSkeleton, EmptyState, ErrorState, InlineError } from "./components/States";
import { TopBar } from "./components/TopBar";
import { Button } from "./components/ui/Button";
import { Card, CardBody, CardHeader } from "./components/ui/Card";
import { InView } from "./components/ui/InView";
import { afterPaint } from "./lib/afterPaint";
import { cn } from "./lib/cn";
import { fmtDay, fmtMW, fmtRange } from "./lib/format";
import { useGuide, useTheme } from "./lib/prefs";
import { DEFAULT_QUERY, cutoffLabel, serializeQuery, useUrlQuery } from "./lib/query";
import { mergeSeries } from "./lib/series";
import { useDashboard, useDebounced, useHealth } from "./useDashboard";

// Recharts is heavy: chart code lives in its own chunks. The hero chart's chunk starts loading in parallel
// with the first data request; the below-the-fold charts are prefetched once the browser is idle.
const loadForecastChart = () => import("./components/charts/ForecastChart");
const loadErrorChart = () => import("./components/charts/ErrorChart");
const loadHorizonChart = () => import("./components/charts/HorizonChart");
const ForecastChart = lazy(loadForecastChart);
const ErrorChart = lazy(loadErrorChart);
const HorizonChart = lazy(loadHorizonChart);

export default function App() {
  const [query, setQuery] = useUrlQuery();
  const debounced = useDebounced(query, 300);
  const { data, loading, slow, error, retry } = useDashboard(debounced);
  const health = useHealth(data);
  const [theme, toggleTheme] = useTheme();
  const [guideOpen, setGuideOpen] = useGuide();

  useEffect(() => {
    void afterPaint().then(loadForecastChart);
    const prefetch = () => {
      void loadErrorChart();
      void loadHorizonChart();
    };
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(prefetch, { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(prefetch, 2000);
    return () => clearTimeout(id);
  }, []);

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
  const resetAll = () => {
    setQuery(DEFAULT_QUERY);
    resetZoom();
  };

  const usedRange = useMemo<[number, number] | null>(() => {
    const h = data?.metrics.points.map((p) => p.horizon_hours) ?? [];
    return h.length ? [Math.min(...h), Math.max(...h)] : null;
  }, [data]);

  const m = data?.metrics;
  const p = m?.params;
  const fileTag = p
    ? `${p.start}_${p.end}_${p.mode === "cutoff" ? `cutoff-${cutoffLabel({ cutoffHour: p.cutoff_hour, cutoffMinute: p.cutoff_minute }).replace(":", "")}` : `h${p.horizon_hours}`}`
    : "";
  const scope = p ? `${p.label} · ${fmtRange(p.start, p.end)}` : "";

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2 focus:text-sm"
      >
        Skip to dashboard
      </a>
      <TopBar health={health} theme={theme} onToggleTheme={toggleTheme} onHelp={() => setGuideOpen(true)} />
      <FilterBar
        query={query}
        onChange={setQuery}
        onReset={resetAll}
        isDefault={serializeQuery(query) === serializeQuery(DEFAULT_QUERY)}
        refreshing={!!data && (loading || query !== debounced)}
      />

      <main id="main" className="mx-auto max-w-[1440px] space-y-6 px-4 py-6 md:px-6">
        {guideOpen && <Guide onDismiss={() => setGuideOpen(false)} />}
        {error && data && <InlineError message={error} onRetry={retry} />}

        {!data || !m ? (
          error ? (
            <ErrorState message={error} onRetry={retry} />
          ) : (
            <DashboardSkeleton slow={slow} />
          )
        ) : m.overall.n === 0 ? (
          <EmptyState onReset={resetAll} />
        ) : (
          <div className={cn("space-y-6 transition-opacity duration-200", loading && "opacity-60")} aria-busy={loading}>
            <KpiRow metrics={m} />

            <Card aria-labelledby="hero-title">
              <CardHeader
                id="hero-title"
                title="Actual vs forecast wind generation"
                description="Drag the handles under the chart to zoom. The error chart follows the same window."
                actions={
                  zoomed && (
                    <>
                      <span className="text-sm text-fg-2">
                        {fmtDay(timeWindow[0])} – {fmtDay(timeWindow[1])}
                      </span>
                      <Button onClick={resetZoom}>
                        <ZoomOut aria-hidden />
                        Reset zoom
                      </Button>
                    </>
                  )
                }
              />
              <CardBody>
                <figure>
                  <figcaption className="sr-only">
                    Line chart of actual and forecast GB wind generation, {fmtRange(m.params.start, m.params.end)}. Mean actual{" "}
                    {fmtMW(m.overall.mean_actual)}, mean forecast {fmtMW(m.overall.mean_forecast)}. The table below lists the daily figures.
                  </figcaption>
                  <InView placeholder={<ChartSkeleton className="h-[328px] sm:h-[408px]" />}>
                    <Suspense fallback={<ChartSkeleton className="h-[328px] sm:h-[408px]" />}>
                      <ForecastChart key={chartKey} rows={rows} range={idx} onRangeChange={setRange} forecastLabel={m.params.label} />
                    </Suspense>
                  </InView>
                </figure>
              </CardBody>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card aria-labelledby="error-title">
                <CardHeader id="error-title" title="Forecast error over time" description="Forecast − actual, hourly. Above zero means the forecast was too high." />
                <CardBody>
                  <InView placeholder={<ChartSkeleton className="h-[268px] sm:h-[308px]" />}>
                    <Suspense fallback={<ChartSkeleton className="h-[268px] sm:h-[308px]" />}>
                      <ErrorChart points={m.points} window={timeWindow} />
                    </Suspense>
                  </InView>
                </CardBody>
              </Card>
              <Card aria-labelledby="horizon-title">
                <CardHeader
                  id="horizon-title"
                  title="Error by forecast horizon"
                  description="MAE of every published forecast run, by hours between publication and delivery."
                />
                <CardBody>
                  <InView placeholder={<ChartSkeleton className="h-[268px] sm:h-[308px]" />}>
                    <Suspense fallback={<ChartSkeleton className="h-[268px] sm:h-[308px]" />}>
                      <HorizonChart buckets={data.horizon.buckets} usedRange={usedRange} />
                    </Suspense>
                  </InView>
                </CardBody>
              </Card>
            </div>

            <InsightsPanel items={m.insights} context={scope} />
            <DailyTable daily={m.daily} points={m.points} fileTag={fileTag} />
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-[1440px] px-4 pb-8 text-xs text-fg-3 md:px-6">
        Data: Elexon BMRS (FUELHH wind outturn, WINDFOR forecasts). Forecasts are hourly; metrics use hours where both exist. Error =
        forecast − actual. Times in UK local time.
      </footer>
    </>
  );
}
