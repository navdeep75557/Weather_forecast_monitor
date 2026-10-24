"""Pydantic response models."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

Mode = Literal["cutoff", "horizon"]


class Metrics(BaseModel):
    n: int
    mae: float | None
    rmse: float | None
    bias: float | None
    mape: float | None
    p90_abs_error: float | None
    max_abs_error: float | None
    mean_actual: float | None
    mean_forecast: float | None
    mape_n: int


class DailyMetrics(Metrics):
    date: date


class HorizonBucket(Metrics):
    bucket: str
    min_hours: int
    max_hours: int


class ActualPoint(BaseModel):
    start_time: datetime
    actual_mw: float


class ForecastPoint(BaseModel):
    start_time: datetime
    publish_time: datetime
    forecast_mw: float
    horizon_hours: float


class JoinedPoint(ForecastPoint):
    actual_mw: float
    error_mw: float


class Insight(BaseModel):
    kind: Literal["bias", "accuracy", "risk", "horizon", "decision", "day", "regime"]
    text: str


class SelectionParams(BaseModel):
    start: date
    end: date
    mode: Mode
    cutoff_hour: int
    cutoff_minute: int
    horizon_hours: int | None
    label: str


class Coverage(BaseModel):
    target_hours: int
    with_forecast: int
    matched_with_actual: int


class MetricsResponse(BaseModel):
    params: SelectionParams
    overall: Metrics
    coverage: Coverage
    daily: list[DailyMetrics]
    points: list[JoinedPoint]
    insights: list[Insight]


class ErrorByHorizonResponse(BaseModel):
    start: date
    end: date
    bucket_hours: int
    max_horizon: int
    buckets: list[HorizonBucket]


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    source: str | None
    loaded_at: datetime | None
    actuals_rows: int
    forecast_rows: int
    forecast_runs: int
    error: str | None
