import { RefreshCw, SearchX, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { KPI_SPAN } from "./KpiRow";
import { Button } from "./ui/Button";
import { Card } from "./ui/Card";
import { Skeleton } from "./ui/Skeleton";

function StateCard({ icon, title, children, action }: { icon: ReactNode; title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Card className="flex flex-col items-center px-6 py-16 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-2 text-fg-2">{icon}</span>
      <h2 className="mt-4 text-base font-semibold">{title}</h2>
      <div className="mt-1 max-w-md text-sm text-fg-2">{children}</div>
      {action && <div className="mt-6">{action}</div>}
    </Card>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <StateCard
      icon={<TriangleAlert aria-hidden className="size-5" />}
      title="We couldn't load the data"
      action={
        <Button variant="primary" size="md" onClick={onRetry}>
          <RefreshCw aria-hidden />
          Retry
        </Button>
      }
    >
      <p>The forecast service didn't respond as expected. If the server was asleep it may just need a moment.</p>
      <p className="mt-2 text-xs text-fg-3">{message}</p>
    </StateCard>
  );
}

export function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <StateCard
      icon={<SearchX aria-hidden className="size-5" />}
      title="No forecasts match this selection"
      action={
        <Button size="md" onClick={onReset}>
          Reset filters
        </Button>
      }
    >
      No forecast was published early enough for these delivery hours. Try a shorter horizon or a later cutoff.
    </StateCard>
  );
}

/** Inline banner when a refetch fails but earlier data is still on screen. */
export function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-danger/40 bg-danger/5 px-4 py-3 text-sm">
      <span className="flex items-center gap-2">
        <TriangleAlert aria-hidden className="size-4 text-danger" />
        Couldn't refresh: {message}. Showing the previous results.
      </span>
      <Button onClick={onRetry}>
        <RefreshCw aria-hidden />
        Retry
      </Button>
    </div>
  );
}

/** Stand-in while the lazy chart chunk loads; pass the chart's height classes so nothing shifts. */
export function ChartSkeleton({ className }: { className: string }) {
  return <Skeleton className={`w-full rounded-lg ${className}`} />;
}

/** Same footprint as the loaded dashboard, so nothing jumps when data arrives. */
export function DashboardSkeleton({ slow }: { slow: boolean }) {
  return (
    <div className="space-y-6" role="status" aria-label="Loading dashboard">
      {slow && (
        <p className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-fg-2">
          Waking up the server. The first load on free hosting can take up to a minute…
        </p>
      )}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-6 xl:grid-cols-5">
        {KPI_SPAN.map((span, i) => (
          <Skeleton key={i} className={`h-36 rounded-xl ${span}`} />
        ))}
      </div>
      <Skeleton className="h-[30rem] rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-96 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </div>
  );
}
