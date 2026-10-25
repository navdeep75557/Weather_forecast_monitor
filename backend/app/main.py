"""FastAPI app: wind forecast vs actual monitoring for day-ahead decisions."""

import logging
from collections.abc import Callable, Hashable
from contextlib import asynccontextmanager
from datetime import date
from functools import cache
from threading import Lock
from typing import Annotated, Any

from fastapi import Depends, FastAPI, HTTPException, Query, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, TypeAdapter

from . import forecasting as fc
from .config import SCOPE_END, SCOPE_START, get_settings
from .data_store import DataStore
from .insights import build_insights
from .metrics import compute_metrics, daily_metrics, error_by_horizon
from .models import (
    ActualPoint,
    ErrorByHorizonResponse,
    ForecastPoint,
    HealthResponse,
    MetricsResponse,
    Mode,
    SelectionParams,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger(__name__)
settings = get_settings()


_store_lock = Lock()


def store_for(app: FastAPI) -> DataStore:
    """The app's data store, loading it on first use if the lifespan hook didn't run (serverless runtimes)."""
    store = getattr(app.state, "store", None)
    if store is None:
        with _store_lock:
            store = getattr(app.state, "store", None)
            if store is None:
                store = DataStore(settings)
                store.load(settings.refresh_on_startup)
                app.state.store = store
    return store


@asynccontextmanager
async def lifespan(app: FastAPI):
    await run_in_threadpool(store_for, app)
    yield


app = FastAPI(title="Wind Forecast Monitor API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_origin_regex=settings.allowed_origin_regex or None,
    allow_methods=["GET"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)  # metrics JSON ~120 KB -> ~20 KB


# Data is immutable per deployment: let browsers and the CDN cache data responses.
CACHEABLE_PATHS = {"/api/actuals", "/api/forecasts/latest", "/api/metrics", "/api/error-by-horizon"}
DATA_CACHE_CONTROL = "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800"


@app.middleware("http")
async def cache_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path in CACHEABLE_PATHS and response.status_code == 200:
        response.headers["Cache-Control"] = DATA_CACHE_CONTROL
    elif request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(Exception)
async def unhandled(_: Request, exc: Exception) -> JSONResponse:
    log.exception("Unhandled error", exc_info=exc)
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ---------- dependencies ----------


def get_store(request: Request) -> DataStore:
    """The loaded data store, or 503 if Elexon data is unavailable."""
    store = store_for(request.app)
    if not store.ready:
        raise HTTPException(503, detail=f"Elexon data not loaded yet: {store.error or 'loading'}")
    return store


class DateRange(BaseModel):
    start: date
    end: date


def date_range(
    start: Annotated[date, Query(description="First target date (London), YYYY-MM-DD")] = SCOPE_START,
    end: Annotated[date, Query(description="Last target date (London), inclusive")] = SCOPE_END,
) -> DateRange:
    """Validated target date range, limited to January 2026."""
    if not (SCOPE_START <= start <= end <= SCOPE_END):
        raise HTTPException(422, detail=f"start/end must satisfy {SCOPE_START} <= start <= end <= {SCOPE_END}")
    return DateRange(start=start, end=end)


def selection(
    rng: Annotated[DateRange, Depends(date_range)],
    mode: Annotated[Mode | None, Query(description="cutoff (D-1 decision time) or horizon (fixed lead time)")] = None,
    cutoff_hour: Annotated[int, Query(ge=0, le=23)] = settings.default_cutoff_hour,
    cutoff_minute: Annotated[int, Query(ge=0, le=59)] = settings.default_cutoff_minute,
    horizon_hours: Annotated[int | None, Query(ge=0, le=48)] = None,
) -> SelectionParams:
    """Selection parameters; mode defaults to horizon if horizon_hours is given, else cutoff."""
    mode = mode or ("horizon" if horizon_hours is not None else "cutoff")
    if mode == "horizon" and horizon_hours is None:
        raise HTTPException(422, detail="horizon_hours is required when mode=horizon")
    label = (
        f"D-1 {cutoff_hour:02d}:{cutoff_minute:02d} forecast"
        if mode == "cutoff"
        else f"{horizon_hours}h-ahead forecast"
    )
    return SelectionParams(
        start=rng.start, end=rng.end, mode=mode, cutoff_hour=cutoff_hour, cutoff_minute=cutoff_minute,
        horizon_hours=horizon_hours if mode == "horizon" else None, label=label,
    )


def select(store: DataStore, p: SelectionParams):
    """Run the forecast selection for the given parameters."""
    if p.mode == "cutoff":
        return fc.select_for_cutoff(store.forecasts, p.start, p.end, p.cutoff_hour, p.cutoff_minute)
    return fc.select_for_horizon(store.forecasts, p.start, p.end, p.horizon_hours)


@cache
def _adapter(model: Any) -> TypeAdapter:
    return TypeAdapter(model)


def cached_json(store: DataStore, key: Hashable, model: Any, build: Callable[[], Any]) -> Response:
    """Validate + serialise a response once per query; later identical requests reuse the bytes."""
    adapter = _adapter(model)
    body = store.cache.get_or_set(key, lambda: adapter.dump_json(adapter.validate_python(build())))
    return Response(content=body, media_type="application/json")


Store = Annotated[DataStore, Depends(get_store)]
Range = Annotated[DateRange, Depends(date_range)]
Selection = Annotated[SelectionParams, Depends(selection)]


# ---------- routes ----------


@app.get("/")
def root() -> dict:
    return {"name": "Wind Forecast Monitor API", "docs": "/docs", "health": "/api/health"}


@app.get("/api/health", response_model=HealthResponse)
def health(request: Request) -> HealthResponse:
    """Service and data-load status."""
    store = store_for(request.app)
    return HealthResponse(
        status="ok" if store.ready else "degraded",
        source=store.source,
        loaded_at=store.loaded_at,
        actuals_rows=len(store.actuals),
        forecast_rows=len(store.forecasts),
        forecast_runs=int(store.forecasts["publish_time"].nunique()) if store.ready else 0,
        error=store.error,
    )


@app.get("/api/actuals", response_model=list[ActualPoint])
def actuals(store: Store, rng: Range) -> Response:
    """Half-hourly wind outturn (FUELHH, fuelType=WIND) for the target range."""

    def build() -> list[dict]:
        return fc.in_window(store.actuals, rng.start, rng.end)[["start_time", "actual_mw"]].to_dict(orient="records")

    return cached_json(store, ("actuals", rng.start, rng.end), list[ActualPoint], build)


@app.get("/api/forecasts/latest", response_model=list[ForecastPoint])
def latest_forecasts(store: Store, p: Selection) -> Response:
    """Latest forecast per target hour available at decision time (cutoff) or H hours ahead (horizon)."""
    return cached_json(store, ("latest", p.model_dump_json()), list[ForecastPoint], lambda: select(store, p).to_dict(orient="records"))


@app.get("/api/metrics", response_model=MetricsResponse)
def metrics(
    store: Store,
    p: Selection,
    include_points: Annotated[bool, Query(description="Include the joined time series")] = True,
) -> Response:
    """Accuracy metrics (overall + daily), joined series and plain-English insights."""
    return cached_json(store, ("metrics", p.model_dump_json(), include_points), MetricsResponse, lambda: _metrics(store, p, include_points))


def _metrics(store: DataStore, p: SelectionParams, include_points: bool) -> dict:
    mape_min = settings.mape_min_actual_mw
    selected = select(store, p)
    joined = fc.join_actuals(selected, store.actuals)
    overall = compute_metrics(joined, mape_min)
    daily = daily_metrics(joined, mape_min)

    runs = fc.all_runs_joined(store.forecasts, store.actuals, p.start, p.end)
    horizon = error_by_horizon(runs, mape_min_actual_mw=mape_min)
    fresh = None
    if not (p.mode == "horizon" and p.horizon_hours == 0):
        fresh_joined = fc.join_actuals(fc.select_for_horizon(store.forecasts, p.start, p.end, 0), store.actuals)
        fresh = compute_metrics(fresh_joined[fresh_joined["start_time"].isin(joined["start_time"])], mape_min)

    target_hours = len(fc.in_window(store.forecasts, p.start, p.end)["start_time"].unique())
    return {
        "params": p,
        "overall": overall,
        "coverage": {"target_hours": target_hours, "with_forecast": len(selected), "matched_with_actual": len(joined)},
        "daily": daily,
        "points": joined.to_dict(orient="records") if include_points else [],
        "insights": build_insights(overall, daily, horizon, joined, fresh, p.label),
    }


@app.get("/api/error-by-horizon", response_model=ErrorByHorizonResponse)
def horizon_errors(
    store: Store,
    rng: Range,
    bucket_hours: Annotated[int, Query(ge=1, le=24)] = 6,
    max_horizon: Annotated[int, Query(ge=1, le=72)] = 48,
) -> Response:
    """Error of ALL forecast runs for targets in range, bucketed by lead time (startTime - publishTime)."""

    def build() -> dict:
        runs = fc.all_runs_joined(store.forecasts, store.actuals, rng.start, rng.end)
        return {
            "start": rng.start,
            "end": rng.end,
            "bucket_hours": bucket_hours,
            "max_horizon": max_horizon,
            "buckets": error_by_horizon(runs, bucket_hours, max_horizon, settings.mape_min_actual_mw),
        }

    return cached_json(store, ("horizon", rng.start, rng.end, bucket_hours, max_horizon), ErrorByHorizonResponse, build)
