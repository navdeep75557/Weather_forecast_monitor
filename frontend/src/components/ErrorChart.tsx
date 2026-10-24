/** Forecast error over time (forecast − actual): one area, red above zero (over-forecast), blue below. */
import { useId, useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtCompact, fmtDateTime, fmtMW, fmtSignedMW, tickFormatter } from "../lib/format";
import { timeTicks } from "../lib/time";
import type { JoinedPoint } from "../types";
import { TooltipCard } from "./ChartTooltip";
import { Legend } from "./Legend";

interface Row {
  t: number;
  error: number;
  actual: number;
  forecast: number;
}

const AXIS = { stroke: "var(--axis)", tick: { fill: "var(--text-muted)", fontSize: 12 }, tickLine: false };

/** Gradient stops that switch colour exactly at y = 0 within the area's bounding box. */
function SplitGradient({ id, offset, opacity }: { id: string; offset: number; opacity: number }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset={offset} style={{ stopColor: "var(--over)", stopOpacity: opacity }} />
      <stop offset={offset} style={{ stopColor: "var(--under)", stopOpacity: opacity }} />
    </linearGradient>
  );
}

export function ErrorChart({ points, window: [t0, t1] }: { points: JoinedPoint[]; window: [number, number] }) {
  const id = useId().replace(/:/g, "");
  const rows = useMemo<Row[]>(
    () =>
      points.map((p) => ({
        t: Date.parse(p.start_time),
        error: p.error_mw,
        actual: p.actual_mw,
        forecast: p.forecast_mw,
      })),
    [points],
  );
  const visible = rows.filter((r) => r.t >= t0 && r.t <= t1);
  const max = Math.max(0, ...visible.map((r) => r.error));
  const min = Math.min(0, ...visible.map((r) => r.error));
  const zeroAt = max - min > 0 ? max / (max - min) : 1;

  return (
    <>
      <Legend
        items={[
          { label: "Over-forecast (forecast above actual)", color: "var(--over)", shape: "rect" },
          { label: "Under-forecast (forecast below actual)", color: "var(--under)", shape: "rect" },
        ]}
      />
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={visible} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <defs>
            <SplitGradient id={`${id}-stroke`} offset={zeroAt} opacity={1} />
            <SplitGradient id={`${id}-fill`} offset={zeroAt} opacity={0.16} />
          </defs>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={[t0, t1]}
            ticks={timeTicks(t0, t1)}
            tickFormatter={tickFormatter(t1 - t0)}
            allowDataOverflow
            {...AXIS}
          />
          <YAxis tickFormatter={fmtCompact} width={44} {...AXIS} axisLine={false} />
          <ReferenceLine y={0} stroke="var(--axis)" />
          <Tooltip
            cursor={{ stroke: "var(--text-muted)", strokeWidth: 1 }}
            content={({ active, payload }) => {
              const row = active && (payload?.[0]?.payload as Row | undefined);
              if (!row) return null;
              return (
                <TooltipCard
                  title={fmtDateTime(row.t)}
                  rows={[
                    { label: "Error", value: fmtSignedMW(row.error), color: row.error >= 0 ? "var(--over)" : "var(--under)" },
                    { label: "Forecast", value: fmtMW(row.forecast) },
                    { label: "Actual", value: fmtMW(row.actual) },
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
            activeDot={{ r: 4, stroke: "var(--surface-1)", strokeWidth: 2, fill: "var(--text-secondary)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </>
  );
}
