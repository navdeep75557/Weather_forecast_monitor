/** Data hooks: dashboard bundle for one query (keeps previous data while refetching) and API health. */
import { startTransition, useEffect, useState } from "react";
import { api } from "./api";
import { afterPaint } from "./lib/afterPaint";
import type { ActualPoint, ErrorByHorizonResponse, HealthResponse, MetricsResponse, Query } from "./types";

export interface Dashboard {
  actuals: ActualPoint[];
  metrics: MetricsResponse;
  horizon: ErrorByHorizonResponse;
}

interface State {
  data?: Dashboard;
  loading: boolean;
  slow: boolean;
  error?: string;
}

const SLOW_MS = 4000;

export function useDashboard(q: Query) {
  const [state, setState] = useState<State>({ loading: true, slow: false });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const ctl = new AbortController();
    setState((s) => ({ ...s, loading: true, error: undefined }));
    const slowTimer = setTimeout(() => setState((s) => ({ ...s, slow: true })), SLOW_MS);
    // Let the shell/skeleton paint first; requests then go out within a frame.
    afterPaint()
      .then(() => Promise.all([api.actuals(q, ctl.signal), api.metrics(q, ctl.signal), api.errorByHorizon(q, ctl.signal)]))
      // Transition: React renders the (chart-heavy) result in interruptible chunks instead of one long task.
      .then(([actuals, metrics, horizon]) =>
        startTransition(() => setState({ data: { actuals, metrics, horizon }, loading: false, slow: false })),
      )
      .catch((err: Error) => {
        if (!ctl.signal.aborted) setState((s) => ({ ...s, loading: false, slow: false, error: err.message }));
      })
      .finally(() => clearTimeout(slowTimer));
    return () => {
      ctl.abort();
      clearTimeout(slowTimer);
    };
  }, [q.start, q.end, q.mode, q.cutoffHour, q.cutoffMinute, q.horizonHours, attempt]);

  return { ...state, retry: () => setAttempt((a) => a + 1) };
}

/** API health, re-checked whenever new dashboard data arrives. */
export function useHealth(trigger: unknown): HealthResponse | null {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  useEffect(() => {
    const ctl = new AbortController();
    afterPaint()
      .then(() => api.health(ctl.signal))
      .then(setHealth, () => !ctl.signal.aborted && setHealth(null));
    return () => ctl.abort();
  }, [trigger]);
  return health;
}

/** Value that only updates after `ms` without changes (keeps sliders from flooding the API). */
export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}
