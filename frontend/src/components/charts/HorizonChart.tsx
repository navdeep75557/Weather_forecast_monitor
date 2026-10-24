/** MAE by lead time across all published runs; buckets used by the current selection are highlighted. */
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fmtMW, fmtNum, fmtPct, fmtSignedMW } from "../../lib/format";
import { niceTicks } from "../../lib/scale";
import type { HorizonBucket } from "../../types";
import { AXIS, ChartLegend, TooltipCard, useNarrow, Y_LABEL } from "./common";

interface Row extends HorizonBucket {
  selected: number | null;
  other: number | null;
}

export default function HorizonChart({ buckets, usedRange }: { buckets: HorizonBucket[]; usedRange: [number, number] | null }) {
  const narrow = useNarrow();
  const inUse = (b: HorizonBucket) => !!usedRange && b.min_hours <= usedRange[1] && b.max_hours > usedRange[0];
  const rows: Row[] = buckets.map((b) => ({ ...b, selected: inUse(b) ? b.mae : null, other: inUse(b) ? null : b.mae }));
  const yTicks = niceTicks(0, Math.max(0, ...buckets.map((b) => b.mae ?? 0)), 6);
  const label = (v: unknown) => (typeof v === "number" ? fmtNum(v) : "");

  return (
    <>
      <ChartLegend
        items={[
          { label: "Lead times in current selection", color: "var(--accent)", shape: "swatch" },
          { label: "Other lead times", color: "var(--fg-3)", shape: "swatch" },
        ]}
      />
      <ResponsiveContainer width="100%" height={narrow ? 240 : 280}>
        <BarChart data={rows} margin={{ top: 24, right: 8, bottom: 0, left: 0 }} barCategoryGap="20%">
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey="bucket"
            interval={0}
            tickFormatter={(b: string) => (narrow ? `${b.split("-")[0]}h` : b)}
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
            cursor={{ fill: "var(--surface-2)" }}
            content={({ active, payload }) => {
              const b = active && (payload?.[0]?.payload as Row | undefined);
              if (!b) return null;
              return (
                <TooltipCard
                  title={`${b.bucket} ahead`}
                  rows={[
                    { label: "MAE", value: fmtMW(b.mae), color: inUse(b) ? "var(--accent)" : "var(--fg-3)" },
                    { label: "Bias", value: fmtSignedMW(b.bias) },
                    { label: "P90 error", value: fmtMW(b.p90_abs_error) },
                    { label: "MAPE", value: fmtPct(b.mape) },
                  ]}
                  note={`${fmtNum(b.n)} forecast–actual pairs`}
                />
              );
            }}
          />
          <Bar dataKey="selected" stackId="mae" fill="var(--accent)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false}>
            {!narrow && <LabelList dataKey="selected" position="top" formatter={label} fill="var(--fg-2)" fontSize={11} />}
          </Bar>
          <Bar dataKey="other" stackId="mae" fill="var(--fg-3)" fillOpacity={0.45} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false}>
            {!narrow && <LabelList dataKey="other" position="top" formatter={label} fill="var(--fg-2)" fontSize={11} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}
