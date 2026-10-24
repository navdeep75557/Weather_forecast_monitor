/** Typed client for the Wind Forecast Monitor API. */
import type {
  ActualPoint,
  ErrorByHorizonResponse,
  HealthResponse,
  MetricsResponse,
  Query,
} from "./types";

const BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function getJSON<T>(path: string, params: Record<string, string | number | boolean> = {}, signal?: AbortSignal): Promise<T> {
  const url = new URL(`${BASE}${path}`, window.location.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  let res: Response;
  try {
    res = await fetch(url, { signal });
  } catch (err) {
    if (signal?.aborted) throw err;
    throw new ApiError(0, "Cannot reach the API. Check that the backend is running and VITE_API_URL is correct.");
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail);
    } catch {
      /* non-JSON error body */
    }
    throw new ApiError(res.status, `API error ${res.status}: ${detail}`);
  }
  return res.json() as Promise<T>;
}

function selectionParams(q: Query): Record<string, string | number> {
  return q.mode === "cutoff"
    ? { start: q.start, end: q.end, mode: q.mode, cutoff_hour: q.cutoffHour, cutoff_minute: q.cutoffMinute }
    : { start: q.start, end: q.end, mode: q.mode, horizon_hours: q.horizonHours };
}

export const api = {
  health: (signal?: AbortSignal) => getJSON<HealthResponse>("/api/health", {}, signal),
  actuals: (q: Query, signal?: AbortSignal) =>
    getJSON<ActualPoint[]>("/api/actuals", { start: q.start, end: q.end }, signal),
  metrics: (q: Query, signal?: AbortSignal) => getJSON<MetricsResponse>("/api/metrics", selectionParams(q), signal),
  errorByHorizon: (q: Query, signal?: AbortSignal) =>
    getJSON<ErrorByHorizonResponse>("/api/error-by-horizon", { start: q.start, end: q.end }, signal),
};
