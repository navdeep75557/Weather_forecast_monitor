"""Shared test helpers."""

import pandas as pd


def ts(s: str) -> pd.Timestamp:
    """UTC timestamp from an ISO-like string."""
    return pd.Timestamp(s, tz="UTC")


def forecasts(rows: list[tuple[str, str, float]]) -> pd.DataFrame:
    """Forecast frame from (publish_time, start_time, forecast_mw) tuples."""
    return pd.DataFrame(
        {
            "publish_time": [ts(p) for p, _, _ in rows],
            "start_time": [ts(s) for _, s, _ in rows],
            "forecast_mw": [float(v) for _, _, v in rows],
        }
    )


def actuals(rows: list[tuple[str, float]]) -> pd.DataFrame:
    """Actuals frame from (start_time, actual_mw) tuples."""
    return pd.DataFrame(
        {
            "start_time": [ts(s) for s, _ in rows],
            "publish_time": [ts(s) for s, _ in rows],
            "actual_mw": [float(v) for _, v in rows],
        }
    )
