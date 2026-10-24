"""Forecast selection: the latest forecast available at decision time, joined to actuals."""

from datetime import date, timedelta

import numpy as np
import pandas as pd

from .config import LONDON

SELECTED_COLUMNS = ["start_time", "publish_time", "forecast_mw", "horizon_hours"]


def utc_window(start: date, end: date) -> tuple[pd.Timestamp, pd.Timestamp]:
    """UTC [from, to) covering London-local dates start..end inclusive."""
    lo = pd.Timestamp(start).tz_localize(LONDON).tz_convert("UTC")
    hi = pd.Timestamp(end + timedelta(days=1)).tz_localize(LONDON).tz_convert("UTC")
    return lo, hi


def in_window(df: pd.DataFrame, start: date, end: date) -> pd.DataFrame:
    """Rows whose start_time falls on London dates start..end."""
    lo, hi = utc_window(start, end)
    return df[(df["start_time"] >= lo) & (df["start_time"] < hi)]


def decision_cutoffs(
    start_times: pd.Series, cutoff_hour: int, cutoff_minute: int, days_before: int = 1
) -> pd.Series:
    """UTC decision cutoff per target: HH:MM Europe/London on (target's London date - days_before).

    Built from naive local wall-clock time so DST transition days are handled correctly.
    """
    local_day = start_times.dt.tz_convert(LONDON).dt.tz_localize(None).dt.normalize()
    wall = local_day - pd.Timedelta(days=days_before) + pd.Timedelta(hours=cutoff_hour, minutes=cutoff_minute)
    # Ambiguous wall times (autumn fall-back) resolve to the earlier instant: the conservative choice.
    cutoff = wall.dt.tz_localize(LONDON, ambiguous=np.ones(len(wall), dtype=bool), nonexistent="shift_forward")
    return cutoff.dt.tz_convert("UTC")


def select_latest(forecasts: pd.DataFrame, cutoff_by_target: pd.Series) -> pd.DataFrame:
    """For each target start_time (index of cutoff_by_target), pick the latest forecast with publish_time <= cutoff."""
    f = forecasts.merge(cutoff_by_target.rename("cutoff"), left_on="start_time", right_index=True)
    f = f[f["publish_time"] <= f["cutoff"]]
    if f.empty:
        return pd.DataFrame(columns=SELECTED_COLUMNS)
    latest = f.loc[f.groupby("start_time")["publish_time"].idxmax()]
    out = latest[["start_time", "publish_time", "forecast_mw"]].sort_values("start_time").reset_index(drop=True)
    out["horizon_hours"] = (out["start_time"] - out["publish_time"]).dt.total_seconds() / 3600
    return out


def _by_target(targets: pd.Series, cutoffs: pd.Series) -> pd.Series:
    """Cutoff series indexed by target start_time (tz-aware on both sides)."""
    return pd.Series(cutoffs.array, index=pd.DatetimeIndex(targets.array))


def select_for_cutoff(
    forecasts: pd.DataFrame, start: date, end: date, cutoff_hour: int, cutoff_minute: int, days_before: int = 1
) -> pd.DataFrame:
    """Cutoff mode: latest forecast published by HH:MM London time on D-1 for each target in range."""
    targets = pd.Series(in_window(forecasts, start, end)["start_time"].unique())
    if targets.empty:
        return pd.DataFrame(columns=SELECTED_COLUMNS)
    cutoffs = decision_cutoffs(targets, cutoff_hour, cutoff_minute, days_before)
    return select_latest(forecasts, _by_target(targets, cutoffs))


def select_for_horizon(forecasts: pd.DataFrame, start: date, end: date, horizon_hours: float) -> pd.DataFrame:
    """Fixed-horizon mode: latest forecast published at least `horizon_hours` before each target."""
    targets = pd.Series(in_window(forecasts, start, end)["start_time"].unique())
    if targets.empty:
        return pd.DataFrame(columns=SELECTED_COLUMNS)
    cutoffs = targets - pd.Timedelta(hours=horizon_hours)
    return select_latest(forecasts, _by_target(targets, cutoffs))


def join_actuals(selected: pd.DataFrame, actuals: pd.DataFrame) -> pd.DataFrame:
    """Inner join on exact start_time (hourly forecasts meet the :00 half-hours); error = forecast - actual."""
    joined = selected.merge(actuals[["start_time", "actual_mw"]], on="start_time", how="inner")
    joined["error_mw"] = joined["forecast_mw"] - joined["actual_mw"]
    return joined.sort_values("start_time").reset_index(drop=True)


def all_runs_joined(forecasts: pd.DataFrame, actuals: pd.DataFrame, start: date, end: date) -> pd.DataFrame:
    """Every forecast run for targets in range joined to actuals, with lead time in hours."""
    f = in_window(forecasts, start, end)
    f = f[f["publish_time"] <= f["start_time"]]
    joined = f.merge(actuals[["start_time", "actual_mw"]], on="start_time", how="inner")
    joined["horizon_hours"] = (joined["start_time"] - joined["publish_time"]).dt.total_seconds() / 3600
    joined["error_mw"] = joined["forecast_mw"] - joined["actual_mw"]
    return joined
