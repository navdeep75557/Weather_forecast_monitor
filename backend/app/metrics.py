"""Forecast accuracy metrics. Error convention: error = forecast - actual (positive = over-forecast)."""

import numpy as np
import pandas as pd

from .config import LONDON


def _r(x: float | None, nd: int = 1) -> float | None:
    """Round, mapping NaN/None to None for JSON."""
    if x is None or pd.isna(x):
        return None
    return round(float(x), nd)


def compute_metrics(df: pd.DataFrame, mape_min_actual_mw: float = 1.0) -> dict:
    """MAE, RMSE, bias, MAPE, P90 |error| and context stats for rows with forecast_mw and actual_mw.

    MAPE skips rows whose actual is below `mape_min_actual_mw` to avoid division by ~zero.
    """
    if df.empty:
        return {
            "n": 0, "mae": None, "rmse": None, "bias": None, "mape": None, "p90_abs_error": None,
            "max_abs_error": None, "mean_actual": None, "mean_forecast": None, "mape_n": 0,
        }
    err = df["forecast_mw"] - df["actual_mw"]
    abs_err = err.abs()
    valid = df["actual_mw"] >= mape_min_actual_mw
    mape = (abs_err[valid] / df.loc[valid, "actual_mw"]).mean() * 100 if valid.any() else None
    return {
        "n": int(len(df)),
        "mae": _r(abs_err.mean()),
        "rmse": _r(np.sqrt((err**2).mean())),
        "bias": _r(err.mean()),
        "mape": _r(mape, 2),
        "p90_abs_error": _r(np.percentile(abs_err, 90)),
        "max_abs_error": _r(abs_err.max()),
        "mean_actual": _r(df["actual_mw"].mean()),
        "mean_forecast": _r(df["forecast_mw"].mean()),
        "mape_n": int(valid.sum()),
    }


def daily_metrics(joined: pd.DataFrame, mape_min_actual_mw: float = 1.0) -> list[dict]:
    """Metrics per London-local target date."""
    if joined.empty:
        return []
    days = joined["start_time"].dt.tz_convert(LONDON).dt.date
    return [
        {"date": day.isoformat(), **compute_metrics(group, mape_min_actual_mw)}
        for day, group in joined.groupby(days, sort=True)
    ]


def error_by_horizon(
    runs: pd.DataFrame, bucket_hours: int = 6, max_horizon: int = 48, mape_min_actual_mw: float = 1.0
) -> list[dict]:
    """Metrics per lead-time bucket [k*bucket, (k+1)*bucket) hours, up to max_horizon."""
    edges = list(range(0, max_horizon + bucket_hours, bucket_hours))
    out = []
    for lo, hi in zip(edges[:-1], edges[1:]):
        hi = min(hi, max_horizon)
        group = runs[(runs["horizon_hours"] >= lo) & (runs["horizon_hours"] < hi)]
        out.append({"bucket": f"{lo}-{hi}h", "min_hours": lo, "max_hours": hi, **compute_metrics(group, mape_min_actual_mw)})
    return out
