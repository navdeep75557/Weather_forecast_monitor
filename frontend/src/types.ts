/** Response shapes mirroring the FastAPI Pydantic models. */

export type Mode = "cutoff" | "horizon";

export interface Metrics {
  n: number;
  mae: number | null;
  rmse: number | null;
  bias: number | null;
  mape: number | null;
  p90_abs_error: number | null;
  max_abs_error: number | null;
  mean_actual: number | null;
  mean_forecast: number | null;
  mape_n: number;
}

export interface DailyMetrics extends Metrics {
  date: string;
}

export interface HorizonBucket extends Metrics {
  bucket: string;
  min_hours: number;
  max_hours: number;
}

export interface ActualPoint {
  start_time: string;
  actual_mw: number;
}

export interface JoinedPoint {
  start_time: string;
  publish_time: string;
  forecast_mw: number;
  horizon_hours: number;
  actual_mw: number;
  error_mw: number;
}

export interface Insight {
  kind: "bias" | "accuracy" | "risk" | "horizon" | "decision" | "day" | "regime";
  text: string;
}

export interface SelectionParams {
  start: string;
  end: string;
  mode: Mode;
  cutoff_hour: number;
  cutoff_minute: number;
  horizon_hours: number | null;
  label: string;
}

export interface MetricsResponse {
  params: SelectionParams;
  overall: Metrics;
  coverage: { target_hours: number; with_forecast: number; matched_with_actual: number };
  daily: DailyMetrics[];
  points: JoinedPoint[];
  insights: Insight[];
}

export interface ErrorByHorizonResponse {
  start: string;
  end: string;
  bucket_hours: number;
  max_horizon: number;
  buckets: HorizonBucket[];
}

export interface HealthResponse {
  status: "ok" | "degraded";
  source: string | null;
  loaded_at: string | null;
  actuals_rows: number;
  forecast_rows: number;
  forecast_runs: number;
  error: string | null;
}

/** User-controlled query that scopes every chart, tile and table. */
export interface Query {
  start: string;
  end: string;
  mode: Mode;
  cutoffHour: number;
  cutoffMinute: number;
  horizonHours: number;
}
