import { Info, LoaderCircle, RotateCcw } from "lucide-react";
import { Suspense, lazy } from "react";
import { useAfterPaint } from "../lib/afterPaint";
import { cn } from "../lib/cn";
import { cutoffLabel, logicSummary } from "../lib/query";
import type { Query } from "../types";
import { RangeTrigger } from "./RangeTrigger";
import { Button } from "./ui/Button";
import { Segmented } from "./ui/Segmented";

// Radix popover/slider code loads in separate chunks; identical-looking static stand-ins render first.
const DateRangePicker = lazy(() => import("./DateRangePicker"));
const Slider = lazy(() => import("./ui/Slider"));

interface FilterBarProps {
  query: Query;
  onChange: (q: Query) => void;
  onReset: () => void;
  isDefault: boolean;
  refreshing: boolean;
}

/** Filters that scope everything below them; sticky on tablet/desktop. */
export function FilterBar({ query, onChange, onReset, isDefault, refreshing }: FilterBarProps) {
  const painted = useAfterPaint(); // load the picker's popover code after first paint
  const set = (patch: Partial<Query>) => onChange({ ...query, ...patch });
  const setCutoff = (v: string) => {
    const m = /^(\d{2}):(\d{2})/.exec(v);
    if (m) set({ cutoffHour: Number(m[1]), cutoffMinute: Number(m[2]) });
  };

  return (
    <div className="z-30 border-b border-border bg-bg/90 backdrop-blur transition-colors duration-150 md:sticky md:top-0">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-2 px-4 py-3 md:px-6">
        <div role="group" aria-label="Filters" className="flex flex-wrap items-center gap-2 tabular-nums md:gap-3">
          {painted ? (
            <Suspense fallback={<RangeTrigger start={query.start} end={query.end} />}>
              <DateRangePicker start={query.start} end={query.end} onChange={(start, end) => set({ start, end })} />
            </Suspense>
          ) : (
            <RangeTrigger start={query.start} end={query.end} />
          )}
          <Segmented
            label="Forecast selection mode"
            value={query.mode}
            onChange={(mode) => set({ mode })}
            options={[
              { value: "cutoff", label: "Decision cutoff" },
              { value: "horizon", label: "Fixed horizon" },
            ]}
          />
          {query.mode === "cutoff" ? (
            <label className="flex items-center gap-2 text-sm text-fg-2">
              Cutoff
              <input
                type="time"
                step={300}
                value={cutoffLabel(query)}
                onChange={(e) => setCutoff(e.target.value)}
                aria-label="Decision cutoff time, UK time on the day before delivery"
                className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-fg"
              />
            </label>
          ) : (
            <div className="flex h-9 items-center gap-3 text-sm text-fg-2">
              <span>Horizon</span>
              <Suspense fallback={<div className="h-5 w-32 sm:w-40" />}>
                <Slider
                  className="w-32 sm:w-40"
                  value={query.horizonHours}
                  min={0}
                  max={48}
                  onChange={(horizonHours) => set({ horizonHours })}
                  label="Forecast horizon in hours"
                  valueText={`${query.horizonHours} hours`}
                />
              </Suspense>
              <span className="w-10 font-medium text-fg">{query.horizonHours} h</span>
            </div>
          )}
          <Button variant="ghost" className="h-9 px-2 lg:px-3" onClick={onReset} disabled={isDefault} aria-label="Reset filters">
            <RotateCcw aria-hidden />
            <span className="hidden lg:inline">Reset</span>
          </Button>
        </div>
        <div className="flex min-h-5 items-center gap-2 text-sm text-fg-2">
          <Info aria-hidden className="size-4 shrink-0 text-fg-3" />
          <p className="min-w-0">{logicSummary(query)}</p>
          <span
            role="status"
            className={cn("ml-auto flex shrink-0 items-center gap-1.5 text-xs text-fg-3 transition-opacity duration-150", !refreshing && "opacity-0")}
          >
            <LoaderCircle aria-hidden className="size-3.5 animate-spin" />
            {refreshing ? "Updating…" : ""}
          </span>
        </div>
      </div>
    </div>
  );
}
