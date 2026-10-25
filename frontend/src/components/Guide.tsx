import { Lightbulb, X } from "lucide-react";
import { Button } from "./ui/Button";

const STEPS = [
  {
    title: "Pick decision days and a rule",
    text: "Choose the January days the buying decision was made (delivery is the next day). Decision cutoff uses the forecast you could actually trade on, published by 09:50 that day. Fixed horizon uses forecasts made H hours ahead.",
  },
  {
    title: "Read the cards",
    text: "MAE is the typical miss, Bias shows the direction (positive = forecast too high), and P90 is a sensible buffer size.",
  },
  {
    title: "Scan the hero chart",
    text: "The black line (white in dark mode) is actual output; blue is the forecast. Blue shading means the forecast was too high, amber too low. Drag the handles to zoom.",
  },
  {
    title: "Dig into detail",
    text: "The lead-time chart shows how accuracy decays further ahead. The table lists every day; sort by any column or export CSV.",
  },
];

/** First-visit explainer; dismissal is remembered per browser. */
export function Guide({ onDismiss }: { onDismiss: () => void }) {
  return (
    <section aria-labelledby="guide-title" className="rounded-xl border border-border bg-accent-soft p-4 transition-colors duration-150 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 id="guide-title" className="flex items-center gap-2 text-base font-semibold">
          <Lightbulb aria-hidden className="size-4 text-accent" />
          How to read this dashboard
        </h2>
        <Button variant="ghost" size="icon" aria-label="Dismiss guide" onClick={onDismiss}>
          <X aria-hidden />
        </Button>
      </div>
      <ol className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="flex gap-3">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-fg ring-1 ring-border">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-semibold">{s.title}</p>
              <p className="mt-0.5 text-sm text-fg-2">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4">
        <Button variant="primary" onClick={onDismiss}>
          Got it
        </Button>
      </div>
    </section>
  );
}
