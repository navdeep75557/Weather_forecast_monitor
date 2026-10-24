"""Accuracy metrics and bucketing."""

import math

import pandas as pd
import pytest

from app.metrics import compute_metrics, daily_metrics, error_by_horizon
from conftest import ts


def frame(fc, act, starts=None):
    starts = starts or [f"2026-01-10T{h:02d}:00" for h in range(len(fc))]
    return pd.DataFrame(
        {
            "start_time": [ts(s) for s in starts],
            "forecast_mw": [float(x) for x in fc],
            "actual_mw": [float(x) for x in act],
        }
    )


def test_known_values():
    m = compute_metrics(frame([110, 90, 100, 120], [100, 100, 100, 100]))
    assert m["n"] == 4
    assert m["mae"] == 10.0
    assert m["rmse"] == round(math.sqrt(150), 1)
    assert m["bias"] == 5.0  # positive = over-forecast
    assert m["mape"] == 10.0
    assert m["p90_abs_error"] == 17.0  # linear interpolation over [0, 10, 10, 20]
    assert m["max_abs_error"] == 20.0


def test_under_forecast_gives_negative_bias():
    assert compute_metrics(frame([90, 80], [100, 100]))["bias"] == -15.0


def test_mape_skips_zero_actuals():
    m = compute_metrics(frame([10, 110], [0, 100]))
    assert m["mae"] == 10.0
    assert m["mape"] == 10.0
    assert m["mape_n"] == 1


def test_mape_none_when_all_actuals_zero():
    m = compute_metrics(frame([10, 20], [0, 0]))
    assert m["mape"] is None
    assert m["mae"] == 15.0


def test_empty_frame():
    m = compute_metrics(frame([], []))
    assert m["n"] == 0 and m["mae"] is None and m["p90_abs_error"] is None


def test_daily_groups_by_london_date():
    df = frame([110, 100, 130], [100, 100, 100], ["2026-01-10T00:00", "2026-01-10T23:00", "2026-01-11T00:00"])
    days = daily_metrics(df)
    assert [d["date"] for d in days] == ["2026-01-10", "2026-01-11"]
    assert days[0]["mae"] == 5.0 and days[1]["mae"] == 30.0


def test_error_by_horizon_buckets():
    runs = pd.DataFrame(
        {
            "horizon_hours": [0.5, 5.9, 6.0, 30.0, 47.9, 48.0, 60.0],
            "forecast_mw": [101, 103, 110, 120, 140, 999, 999],
            "actual_mw": [100] * 7,
        }
    )
    buckets = error_by_horizon(runs, bucket_hours=6, max_horizon=48)
    assert [b["bucket"] for b in buckets][:2] == ["0-6h", "6-12h"]
    assert len(buckets) == 8
    by = {b["bucket"]: b for b in buckets}
    assert by["0-6h"]["n"] == 2 and by["0-6h"]["mae"] == 2.0
    assert by["6-12h"]["mae"] == 10.0
    assert by["42-48h"]["n"] == 1  # 48.0 and 60.0 fall outside
    assert by["12-18h"]["n"] == 0 and by["12-18h"]["mae"] is None


@pytest.mark.parametrize("bucket,expected", [(5, 10), (7, 7)])
def test_bucket_edges_cap_at_max(bucket, expected):
    runs = pd.DataFrame({"horizon_hours": [1.0], "forecast_mw": [1.0], "actual_mw": [1.0]})
    buckets = error_by_horizon(runs, bucket_hours=bucket, max_horizon=48)
    assert len(buckets) == expected
    assert buckets[-1]["max_hours"] == 48
