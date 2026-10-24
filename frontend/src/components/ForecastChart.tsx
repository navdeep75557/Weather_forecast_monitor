/** Actual (half-hourly) vs selected forecast (hourly) with a brush that zooms both time charts. */
import { Brush, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtCompact, fmtDateTime, fmtDay, fmtMW, fmtSignedMW, tickFormatter } from "../lib/format";
import { niceTicks } from "../lib/scale";
import { timeTicks } from "../lib/time";
import type { ActualPoint, JoinedPoint } from "../types";
import { TooltipCard } from "./ChartTooltip";
import { Legend } from "./Legend";

export interface SeriesRow {
  t: number;
  actual: number | null;
  forecast: number | null;
  publish?: number;
  horizon?: number;
}

/** Merge half-hourly actuals with hourly forecasts on the timestamp. */
export function mergeSeries(actuals: ActualPoint[], points: JoinedPoint[]): SeriesRow[] {
  const rows = new Map<number, SeriesRow>();
  for (const a of actuals) {
    const t = Date.parse(a.start_time);
    rows.set(t, { t, actual: a.actual_mw, forecast: null });
  }
  for (const p of points) {
    const t = Date.parse(p.start_time);
    const row = rows.get(t) ?? { t, actual: null, forecast: null };
    row.forecast = p.forecast_mw;
    row.publish = Date.parse(p.publish_time);
    row.horizon = p.horizon_hours;
    rows.set(t, row);
  }
  return [...rows.values()].sort((a, b) => a.t - b.t);
}

const AXIS = { stroke: "var(--axis)", tick: { fill: "var(--text-muted)", fontSize: 12 }, tickLine: false };

interface Props {
  rows: SeriesRow[];
  range: [number, number];
  onRangeChange: (r: [number, number]) => void;
  forecastLabel: string;
}

export function ForecastChart({ rows, range, onRangeChange, forecastLabel }: Props) {
  const t0 = rows[range[0]]?.t ?? 0;
  const t1 = rows[range[1]]?.t ?? 0;
  const yMax = Math.max(0, ...rows.map((r) => Math.max(r.actual ?? 0, r.forecast ?? 0)));
  const yTicks = niceTicks(0, yMax, 6);
  return (
    <>
      <Legend
        items={[
          { label: "Actual (FUELHH, half-hourly)", color: "var(--series-1)" },
          { label: `Forecast: ${forecastLabel} (hourly)`, color: "var(--series-2)" },
        ]}
      />
      <ResponsiveContainer width="100%" height={340}>
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={[t0, t1]}
            ticks={timeTicks(t0, t1)}
            tickFormatter={tickFormatter(t1 - t0)}
            {...AXIS}
          />
          <YAxis tickFormatter={fmtCompact} width={44} domain={[yTicks[0], yTicks[yTicks.length - 1]]} ticks={yTicks} {...AXIS} axisLine={false} />
          <Tooltip
            cursor={{ stroke: "var(--text-muted)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              const row = active && (payload?.[0]?.payload as SeriesRow | undefined);
              if (!row) return null;
              const err = row.actual != null && row.forecast != null ? row.forecast - row.actual : null;
              return (
                <TooltipCard
                  title={fmtDateTime(row.t)}
                  rows={[
                    { label: "Actual", value: fmtMW(row.actual), color: "var(--series-1)" },
                    { label: "Forecast", value: fmtMW(row.forecast), color: "var(--series-2)" },
                    ...(err != null ? [{ label: "Error (fcst − actual)", value: fmtSignedMW(err) }] : []),
                  ]}
                  note={
                    row.publish
                      ? `Published ${fmtDateTime(row.publish)} · ${row.horizon?.toFixed(1)}h ahead`
                      : row.actual != null
                        ? "Half-hour point: forecasts are hourly"
                        : undefined
                  }
                />
              );
            }}
          />
          <Line
            dataKey="actual"
            name="Actual"
            stroke="var(--series-1)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--surface-1)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
          <Line
            dataKey="forecast"
            name="Forecast"
            stroke="var(--series-2)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--surface-1)", strokeWidth: 2 }}
            connectNulls
            isAnimationActive={false}
          />
          <Brush
            dataKey="t"
            height={28}
            startIndex={range[0]}
            endIndex={range[1]}
            onChange={(r) => onRangeChange([r.startIndex ?? 0, r.endIndex ?? rows.length - 1])}
            tickFormatter={(t: number) => fmtDay(t)}
            stroke="var(--axis)"
            fill="var(--surface-1)"
            travellerWidth={10}
          />
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
