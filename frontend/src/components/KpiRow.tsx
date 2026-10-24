/** Headline accuracy cards. Rose meters = size of error vs mean output; blue/amber = direction of bias. */
import { TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "../lib/cn";
import { fmtMW, fmtNum, fmtPct, fmtSigned } from "../lib/format";
import type { MetricsResponse } from "../types";
import { InfoTip } from "./ui/InfoTip";

interface Kpi {
  id: string;
  label: string;
  value: string;
  unit: string;
  tip: string;
  /** Share of mean output (0-1) for the magnitude meter; null for bias. */
  share: number | null;
  caption: string;
}

function MagnitudeMeter({ share }: { share: number }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
      <div className="h-full rounded-full bg-heat transition-[width] duration-200" style={{ width: `${Math.min(share, 1) * 100}%` }} />
    </div>
  );
}

function BiasMeter({ bias, mean }: { bias: number; mean: number }) {
  // Half-width of the track = 50% of mean output.
  const width = Math.min(Math.abs(bias) / mean / 0.5, 1) * 50;
  return (
    <div className="relative h-1.5 rounded-full bg-surface-2" aria-hidden>
      <span className="absolute top-[-3px] left-1/2 h-3 w-px bg-border-strong" />
      <div
        className={cn("absolute h-full rounded-full transition-[width] duration-200", bias >= 0 ? "left-1/2 bg-over" : "right-1/2 bg-under")}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

/** 2-up on phones (last card full width), 3 + 2 on tablets, 5 across on desktop. */
export const KPI_SPAN = [
  "md:col-span-2 xl:col-span-1",
  "md:col-span-2 xl:col-span-1",
  "md:col-span-2 xl:col-span-1",
  "md:col-span-3 xl:col-span-1",
  "col-span-2 md:col-span-3 xl:col-span-1",
];

export function KpiRow({ metrics }: { metrics: MetricsResponse }) {
  const m = metrics.overall;
  const mean = m.mean_actual ?? 0;
  const share = (v: number | null) => (v != null && mean ? v / mean : 0);
  const pctOfMean = (v: number | null) => `${Math.round(share(v) * 100)}% of mean output`;

  const kpis: Kpi[] = [
    {
      id: "mae",
      label: "MAE",
      value: fmtNum(m.mae),
      unit: "MW",
      tip: "Mean absolute error: the typical size of a miss, ignoring direction. Lower is better.",
      share: share(m.mae),
      caption: pctOfMean(m.mae),
    },
    {
      id: "rmse",
      label: "RMSE",
      value: fmtNum(m.rmse),
      unit: "MW",
      tip: "Root mean squared error: like MAE but punishes big misses more. Much higher than MAE means a few large misses dominate.",
      share: share(m.rmse),
      caption: pctOfMean(m.rmse),
    },
    {
      id: "bias",
      label: "Bias",
      value: fmtSigned(m.bias),
      unit: "MW",
      tip: "Average of forecast minus actual. Positive means the forecast was too high (over-forecast); negative means too low.",
      share: null,
      caption: m.bias == null ? "" : m.bias >= 0 ? "Forecast too high on average" : "Forecast too low on average",
    },
    {
      id: "mape",
      label: "MAPE",
      value: m.mape == null ? "–" : fmtPct(m.mape).replace("%", ""),
      unit: "%",
      tip: "Mean absolute percentage error: the typical miss as a share of actual output. Inflated in calm, low-output hours.",
      share: (m.mape ?? 0) / 100,
      caption: "Typical miss vs actual output",
    },
    {
      id: "p90",
      label: "P90 error",
      value: fmtNum(m.p90_abs_error),
      unit: "MW",
      tip: "9 in 10 hours missed by less than this. A practical size for a day-ahead wind buffer.",
      share: share(m.p90_abs_error),
      caption: `9 in 10 hours within ±${fmtMW(m.p90_abs_error)}`,
    },
  ];

  const c = metrics.coverage;
  return (
    <section aria-label="Accuracy metrics">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-6 xl:grid-cols-5">
        {kpis.map((k, i) => (
          <div
            key={k.id}
            data-testid={`kpi-${k.id}`}
            className={cn(
              "flex min-h-36 flex-col rounded-xl border border-border bg-surface p-4 shadow-card transition-colors duration-150",
              KPI_SPAN[i],
            )}
          >
            <div className="flex items-center gap-1 text-sm font-medium text-fg-2">
              {k.label}
              <InfoTip label={`What is ${k.label}?`}>{k.tip}</InfoTip>
            </div>
            <div className="mt-2 flex items-baseline gap-1">
              <span data-testid="kpi-value" className="text-display font-semibold tracking-tight tabular-nums">
                {k.value}
              </span>
              <span className="text-sm text-fg-3">{k.unit}</span>
            </div>
            <div className="mt-auto pt-3">
              {k.share == null ? <BiasMeter bias={m.bias ?? 0} mean={mean || 1} /> : <MagnitudeMeter share={k.share} />}
              <p className="mt-2 flex items-center gap-1 text-xs text-fg-3">
                {k.id === "bias" &&
                  m.bias != null &&
                  (m.bias >= 0 ? <TrendingUp aria-hidden className="size-3.5 text-over" /> : <TrendingDown aria-hidden className="size-3.5 text-under" />)}
                {k.caption}
              </p>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-fg-3 tabular-nums">
        {fmtNum(m.n)} hourly forecast–actual pairs · mean actual {fmtMW(m.mean_actual)} · mean forecast {fmtMW(m.mean_forecast)}
        {c.with_forecast < c.target_hours && ` · ${fmtNum(c.target_hours - c.with_forecast)} delivery hours had no eligible forecast`}
      </p>
    </section>
  );
}
