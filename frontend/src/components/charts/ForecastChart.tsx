/** Hero chart: actual vs forecast with a shaded error band, crosshair tooltip and a brush that zooms the time charts. */
import { Area, Brush, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtDateTime, fmtDay, fmtHours, fmtMW, fmtNum, fmtSignedMW, tickFormatter } from "../../lib/format";
import { niceTicks } from "../../lib/scale";
import type { SeriesRow } from "../../lib/series";
import { timeTicks } from "../../lib/time";
import { AXIS, ChartLegend, TooltipCard, useNarrow, Y_LABEL } from "./common";

interface Props {
  rows: SeriesRow[];
  range: [number, number];
  onRangeChange: (r: [number, number]) => void;
  forecastLabel: string;
}

export default function ForecastChart({ rows, range, onRangeChange, forecastLabel }: Props) {
  const narrow = useNarrow();
  const t0 = rows[range[0]]?.t ?? 0;
  const t1 = rows[range[1]]?.t ?? 0;
  const yMax = Math.max(0, ...rows.map((r) => Math.max(r.actual ?? 0, r.forecast ?? 0)));
  const yTicks = niceTicks(0, yMax, 6);

  return (
    <>
      <ChartLegend
        items={[
          { label: "Actual (half-hourly)", color: "var(--actual)", shape: "line" },
          { label: `Forecast: ${forecastLabel}`, color: "var(--forecast)", shape: "line" },
          { label: "Forecast too high", color: "var(--over)", shape: "swatch" },
          { label: "Forecast too low", color: "var(--under)", shape: "swatch" },
        ]}
      />
      <ResponsiveContainer width="100%" height={narrow ? 300 : 380}>
        <ComposedChart data={rows} margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={[t0, t1]}
            ticks={timeTicks(t0, t1, narrow ? 4 : 8)}
            tickFormatter={tickFormatter(t1 - t0)}
            {...AXIS}
          />
          <YAxis
            width={56}
            domain={[0, yTicks[yTicks.length - 1]]}
            ticks={yTicks}
            tickFormatter={fmtNum}
            label={Y_LABEL}
            {...AXIS}
            axisLine={false}
          />
          <Tooltip
            cursor={{ stroke: "var(--fg-3)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              const row = active && (payload?.[0]?.payload as SeriesRow | undefined);
              if (!row) return null;
              const err = row.actual != null && row.forecast != null ? row.forecast - row.actual : null;
              return (
                <TooltipCard
                  title={fmtDateTime(row.t)}
                  rows={[
                    { label: "Actual", value: fmtMW(row.actual), color: "var(--actual)" },
                    { label: "Forecast", value: fmtMW(row.forecast), color: "var(--forecast)" },
                    ...(err != null
                      ? [{ label: err >= 0 ? "Error (too high)" : "Error (too low)", value: fmtSignedMW(err), color: err >= 0 ? "var(--over)" : "var(--under)" }]
                      : []),
                  ]}
                  note={
                    row.publish
                      ? `Forecast published ${fmtDateTime(row.publish)} (${fmtHours(row.horizon)} ahead)`
                      : row.actual != null
                        ? "Half-hour point: forecasts are hourly"
                        : undefined
                  }
                />
              );
            }}
          />
          <Area dataKey="overBand" type="linear" stroke="none" fill="var(--over)" fillOpacity={0.16} connectNulls isAnimationActive={false} activeDot={false} />
          <Area dataKey="underBand" type="linear" stroke="none" fill="var(--under)" fillOpacity={0.2} connectNulls isAnimationActive={false} activeDot={false} />
          <Line
            dataKey="actual"
            name="Actual"
            stroke="var(--actual)"
            strokeWidth={1.75}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
          <Line
            dataKey="forecast"
            name="Forecast"
            stroke="var(--forecast)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2 }}
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
            stroke="var(--border-strong)"
            fill="var(--surface)"
            travellerWidth={10}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </>
  );
}
