import { CalendarDays, ChevronDown, Clock, Hourglass, Lightbulb, type LucideIcon, Scale, ShieldAlert, Target, Wind } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/cn";
import type { Insight } from "../types";
import { Card, CardBody, CardHeader } from "./ui/Card";

const META: Record<Insight["kind"], { title: string; icon: LucideIcon }> = {
  bias: { title: "Direction of error", icon: Scale },
  risk: { title: "Risk sizing", icon: ShieldAlert },
  decision: { title: "Cost of deciding early", icon: Clock },
  horizon: { title: "Lead time", icon: Hourglass },
  regime: { title: "Wind regime", icon: Wind },
  day: { title: "Best and worst days", icon: CalendarDays },
  accuracy: { title: "Typical error", icon: Target },
};
const ORDER: Insight["kind"][] = ["bias", "risk", "decision", "horizon", "regime", "day", "accuracy"];
const SHOWN = 4;

export function InsightsPanel({ items, context }: { items: Insight[]; context: string }) {
  const [all, setAll] = useState(false);
  const sorted = [...items].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
  const visible = all ? sorted : sorted.slice(0, SHOWN);
  return (
    <Card aria-labelledby="insights-title">
      <CardHeader id="insights-title" title="Key insights" description={context} />
      <CardBody>
        <ul className="grid gap-4 md:grid-cols-2">
          {visible.map((i) => {
            const { title, icon: Icon } = META[i.kind];
            return (
              <li key={i.kind + i.text} className="flex gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-fg-2">
                  <Icon aria-hidden className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-fg-2">{i.text}</p>
                </div>
              </li>
            );
          })}
        </ul>
        {sorted.length > SHOWN && (
          <button
            type="button"
            aria-expanded={all}
            onClick={() => setAll((v) => !v)}
            className="mt-4 inline-flex cursor-pointer items-center gap-1 rounded-md text-sm font-medium text-accent hover:underline"
          >
            {all ? "Show fewer" : `Show all ${sorted.length} insights`}
            <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-150", all && "rotate-180")} />
          </button>
        )}
        {!items.length && (
          <p className="flex items-center gap-2 text-sm text-fg-3">
            <Lightbulb aria-hidden className="size-4" />
            No insights for this selection.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
