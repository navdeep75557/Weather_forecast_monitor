/** Forecast error over time (forecast − actual): one area, blue above zero (too high), amber below (too low). */
import { useId, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtDateTime, fmtMW, fmtNum, fmtSignedMW, tickFormatter } from "../../lib/format";
import { niceTicks } from "../../lib/scale";
import { timeTicks } from "../../lib/time";
import type { JoinedPoint } from "../../types";
import { AXIS, ChartLegend, TooltipCard, useNarrow, Y_LABEL } from "./common";

interface Row {
  t: number;
  error: number;
  actual: number;
  forecast: number;
}

/** Gradient stops that switch colour exactly at y = 0 within the area's bounding box. */
function SplitGradient({ id, offset, opacity }: { id: string; offset: number; opacity: number }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset={offset} style={{ stopColor: "var(--over)", stopOpacity: opacity }} />
      <stop offset={offset} style={{ stopColor: "var(--under)", stopOpacity: opacity }} />
    </linearGradient>
  );
}

export default function ErrorChart({ points, window: [t0, t1] }: { points: JoinedPoint[]; window: [number, number] }) {
  const narrow = useNarrow();
  const id = useId().replace(/:/g, "");
  const rows = useMemo<Row[]>(
    () => points.map((p) => ({ t: Date.parse(p.start_time), error: p.error_mw, actual: p.actual_mw, forecast: p.forecast_mw })),
    [points],
  );
  const visible = rows.filter((r) => r.t >= t0 && r.t <= t1);
  const max = Math.max(0, ...visible.map((r) => r.error));
  const min = Math.min(0, ...visible.map((r) => r.error));
  const zeroAt = max - min > 0 ? max / (max - min) : 1;
  const yTicks = niceTicks(min, max, 6);

  return (
    <>
      <ChartLegend
        items={[
          { label: "Forecast too high", color: "var(--over)", shape: "swatch" },
          { label: "Forecast too low", color: "var(--under)", shape: "swatch" },
        ]}
      />
      <ResponsiveContainer width="100%" height={narrow ? 240 : 280}>
        <AreaChart data={visible} margin={{ top: 24, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <SplitGradient id={`${id}-stroke`} offset={zeroAt} opacity={1} />
            <SplitGradient id={`${id}-fill`} offset={zeroAt} opacity={0.18} />
          </defs>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={[t0, t1]}
            ticks={timeTicks(t0, t1, narrow ? 4 : 6)}
            tickFormatter={tickFormatter(t1 - t0)}
            allowDataOverflow
            {...AXIS}
          />
          <YAxis
            width={56}
            domain={[yTicks[0], yTicks[yTicks.length - 1]]}
            ticks={yTicks}
            tickFormatter={fmtNum}
            label={Y_LABEL}
            {...AXIS}
            axisLine={false}
          />
          <ReferenceLine y={0} stroke="var(--fg-3)" />
          <Tooltip
            cursor={{ stroke: "var(--fg-3)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              const row = active && (payload?.[0]?.payload as Row | undefined);
              if (!row) return null;
              return (
                <TooltipCard
                  title={fmtDateTime(row.t)}
                  rows={[
                    { label: row.error >= 0 ? "Error (too high)" : "Error (too low)", value: fmtSignedMW(row.error), color: row.error >= 0 ? "var(--over)" : "var(--under)" },
                    { label: "Forecast", value: fmtMW(row.forecast), color: "var(--forecast)" },
                    { label: "Actual", value: fmtMW(row.actual), color: "var(--actual)" },
                  ]}
                />
              );
            }}
          />
          <Area
            dataKey="error"
            name="Error"
            type="linear"
            baseValue={0}
            stroke={`url(#${id}-stroke)`}
            strokeWidth={1.5}
            fill={`url(#${id}-fill)`}
            isAnimationActive={false}
            activeDot={{ r: 4, stroke: "var(--surface)", strokeWidth: 2, fill: "var(--fg-2)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </>
  );
}
