/** Picks January 2026 decision days (presets + one-month calendar); reports delivery dates (decision + 1 day). */
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { type KeyboardEvent, useRef, useState } from "react";
import { cn } from "../lib/cn";
import { decisionToDelivery, deliveryToDecision } from "../lib/query";
import { RangeTrigger } from "./RangeTrigger";

const PRESETS = [
  { label: "All of January", start: "2026-01-01", end: "2026-01-31" },
  { label: "1–7 Jan", start: "2026-01-01", end: "2026-01-07" },
  { label: "8–14 Jan", start: "2026-01-08", end: "2026-01-14" },
  { label: "15–21 Jan", start: "2026-01-15", end: "2026-01-21" },
  { label: "22–31 Jan", start: "2026-01-22", end: "2026-01-31" },
];
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const LEADING_BLANKS = 3; // 1 Jan 2026 is a Thursday
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const KEY_STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
const dayName = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" });

const toIso = (d: number) => `2026-01-${String(d).padStart(2, "0")}`;
const toDay = (iso: string) => Number(iso.slice(8, 10));

interface Props {
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
}

export default function DateRangePicker({ start, end, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<number | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const grid = useRef<HTMLDivElement>(null);

  // Props are delivery dates; the calendar shows the decision day before each.
  const decisionStart = deliveryToDecision(start);
  const decisionEnd = deliveryToDecision(end);
  const [lo, hi] =
    anchor == null ? [toDay(decisionStart), toDay(decisionEnd)] : [Math.min(anchor, hover ?? anchor), Math.max(anchor, hover ?? anchor)];
  const emit = (fromDecision: string, toDecision: string) => onChange(decisionToDelivery(fromDecision), decisionToDelivery(toDecision));

  const close = () => {
    setOpen(false);
    setAnchor(null);
    setHover(null);
  };
  const pick = (d: number) => {
    if (anchor == null) {
      setAnchor(d);
      setHover(d);
      return;
    }
    emit(toIso(Math.min(anchor, d)), toIso(Math.max(anchor, d)));
    close();
  };
  const onKey = (e: KeyboardEvent, d: number) => {
    const step = KEY_STEP[e.key];
    if (!step) return;
    e.preventDefault();
    const next = Math.min(31, Math.max(1, d + step));
    grid.current?.querySelector<HTMLButtonElement>(`[data-day="${next}"]`)?.focus();
    if (anchor != null) setHover(next);
  };

  return (
    <Popover.Root open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <Popover.Trigger asChild>
        <RangeTrigger start={start} end={end} />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          collisionPadding={16}
          className="z-50 flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 tabular-nums shadow-lg sm:flex-row"
        >
          <div className="flex flex-wrap gap-1 sm:w-32 sm:flex-col" role="group" aria-label="Presets">
            {PRESETS.map((p) => {
              const active = p.start === decisionStart && p.end === decisionEnd;
              return (
                <button
                  key={p.label}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    emit(p.start, p.end);
                    close();
                  }}
                  className={cn(
                    "flex h-8 cursor-pointer items-center justify-between gap-2 rounded-md px-2 text-left text-sm transition-colors duration-150 hover:bg-surface-2",
                    active ? "font-semibold text-fg" : "text-fg-2",
                  )}
                >
                  {p.label}
                  {active && <Check aria-hidden className="size-4 text-accent" />}
                </button>
              );
            })}
          </div>

          <div className="w-[17.5rem]">
            <div className="mb-2 flex items-center justify-between">
              <button type="button" disabled aria-label="Previous month (only January 2026 is available)" className="rounded-md p-1 text-fg-3 opacity-40">
                <ChevronLeft aria-hidden className="size-4" />
              </button>
              <span className="text-sm font-semibold">Decision days · January 2026</span>
              <button type="button" disabled aria-label="Next month (only January 2026 is available)" className="rounded-md p-1 text-fg-3 opacity-40">
                <ChevronRight aria-hidden className="size-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs text-fg-3" aria-hidden>
              {WEEKDAYS.map((w) => (
                <span key={w} className="py-1">
                  {w}
                </span>
              ))}
            </div>
            <div ref={grid} className="grid grid-cols-7 gap-y-1" role="group" aria-label="Decision days, January 2026" onMouseLeave={() => anchor != null && setHover(anchor)}>
              {Array.from({ length: LEADING_BLANKS }, (_, i) => (
                <span key={`b${i}`} />
              ))}
              {DAYS.map((d) => {
                const inRange = d >= lo && d <= hi;
                const edge = d === lo || d === hi;
                return (
                  <button
                    key={d}
                    type="button"
                    data-day={d}
                    aria-pressed={inRange}
                    aria-label={`${dayName.format(new Date(Date.UTC(2026, 0, d)))} ${d} January 2026`}
                    onClick={() => pick(d)}
                    onMouseEnter={() => anchor != null && setHover(d)}
                    onKeyDown={(e) => onKey(e, d)}
                    className={cn(
                      "h-9 cursor-pointer text-sm transition-colors duration-150",
                      inRange && !edge && "bg-accent-soft text-fg",
                      edge ? "rounded-md bg-accent font-semibold text-accent-fg" : "rounded-md hover:bg-surface-2",
                    )}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-fg-3" aria-live="polite">
              {anchor == null
                ? "Pick the days the buying decision was made; delivery is the next day. Click a start date, then an end date."
                : "Now click an end date."}
            </p>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
