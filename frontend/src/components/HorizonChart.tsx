/** MAE by forecast lead time across all published runs; buckets used by the current selection are accented. */
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtCompact, fmtMW, fmtNum, fmtPct, fmtSignedMW } from "../lib/format";
import { niceTicks } from "../lib/scale";
import type { HorizonBucket } from "../types";
import { TooltipCard } from "./ChartTooltip";
import { Legend } from "./Legend";

interface Row extends HorizonBucket {
  selected: number | null;
  other: number | null;
}

const AXIS = { stroke: "var(--axis)", tick: { fill: "var(--text-muted)", fontSize: 12 }, tickLine: false };

export function HorizonChart({ buckets, usedRange }: { buckets: HorizonBucket[]; usedRange: [number, number] | null }) {
  const inUse = (b: HorizonBucket) => !!usedRange && b.min_hours <= usedRange[1] && b.max_hours > usedRange[0];
  const rows: Row[] = buckets.map((b) => ({
    ...b,
    selected: inUse(b) ? b.mae : null,
    other: inUse(b) ? null : b.mae,
  }));
  const yTicks = niceTicks(0, Math.max(0, ...buckets.map((b) => b.mae ?? 0)), 6);
  const label = (v: unknown) => (typeof v === "number" ? fmtCompact(Math.round(v)) : "");
  return (
    <>
      <Legend
        items={[
          { label: "Lead times used by current selection", color: "var(--series-2)", shape: "rect" },
          { label: "Other lead times", color: "var(--deemph)", shape: "rect" },
        ]}
      />
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={rows} margin={{ top: 20, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%">
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="bucket" {...AXIS} />
          <YAxis tickFormatter={fmtCompact} width={44} domain={[0, yTicks[yTicks.length - 1]]} ticks={yTicks} {...AXIS} axisLine={false} />
          <Tooltip
            cursor={{ fill: "var(--hover-wash)" }}
            content={({ active, payload }) => {
              const b = active && (payload?.[0]?.payload as Row | undefined);
              if (!b) return null;
              return (
                <TooltipCard
                  title={`${b.bucket} ahead`}
                  rows={[
                    { label: "MAE", value: fmtMW(b.mae), color: inUse(b) ? "var(--series-2)" : "var(--deemph)" },
                    { label: "Bias", value: fmtSignedMW(b.bias) },
                    { label: "P90 |error|", value: fmtMW(b.p90_abs_error) },
                    { label: "MAPE", value: fmtPct(b.mape) },
                  ]}
                  note={`${fmtNum(b.n)} forecast–actual pairs`}
                />
              );
            }}
          />
          <Bar dataKey="selected" stackId="mae" fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
            <LabelList dataKey="selected" position="top" formatter={label} className="bar-label" />
          </Bar>
          <Bar dataKey="other" stackId="mae" fill="var(--deemph)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false}>
            <LabelList dataKey="other" position="top" formatter={label} className="bar-label" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}
