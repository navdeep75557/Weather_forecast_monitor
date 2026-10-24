/** Fetches everything the dashboard needs for one query; keeps the previous data while refetching. */
import { useEffect, useState } from "react";
import { api } from "./api";
import type { ActualPoint, ErrorByHorizonResponse, MetricsResponse, Query } from "./types";

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
    Promise.all([api.actuals(q, ctl.signal), api.metrics(q, ctl.signal), api.errorByHorizon(q, ctl.signal)])
      .then(([actuals, metrics, horizon]) => setState({ data: { actuals, metrics, horizon }, loading: false, slow: false }))
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

/** Value that only updates after `ms` without changes (keeps sliders from flooding the API). */
export function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}
