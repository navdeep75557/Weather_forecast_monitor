"""Forecast selection: D-1 cutoff, fixed horizon, DST handling and the join."""

from datetime import date, datetime, time, timedelta, timezone

import pandas as pd
import pytest

from app import forecasting as fc
from app.config import LONDON
from conftest import actuals, forecasts, ts

TARGET = "2026-01-10T12:00"
RUNS = forecasts(
    [
        ("2026-01-09T07:30", TARGET, 1000),
        ("2026-01-09T09:30", TARGET, 1100),
        ("2026-01-09T11:30", TARGET, 1200),  # after the 09:50 cutoff
        ("2026-01-10T09:30", TARGET, 1300),  # same day: too late for D-1
        ("2026-01-10T11:30", TARGET, 1400),
    ]
)
DAY = date(2026, 1, 10)


def test_cutoff_picks_latest_run_before_cutoff():
    out = fc.select_for_cutoff(RUNS, DAY, DAY, 9, 50)
    assert len(out) == 1
    row = out.iloc[0]
    assert row.publish_time == ts("2026-01-09T09:30")
    assert row.forecast_mw == 1100
    assert row.horizon_hours == 26.5


def test_cutoff_is_configurable():
    assert fc.select_for_cutoff(RUNS, DAY, DAY, 9, 0).iloc[0].forecast_mw == 1000
    assert fc.select_for_cutoff(RUNS, DAY, DAY, 12, 0).iloc[0].forecast_mw == 1200


def test_publish_exactly_at_cutoff_is_included():
    assert fc.select_for_cutoff(RUNS, DAY, DAY, 9, 30).iloc[0].forecast_mw == 1100


def test_target_without_eligible_forecast_is_dropped():
    late_only = forecasts([("2026-01-09T11:30", TARGET, 1200)])
    assert fc.select_for_cutoff(late_only, DAY, DAY, 9, 50).empty


def test_all_hours_of_day_share_the_same_d_minus_1_cutoff():
    runs = forecasts(
        [
            ("2026-01-09T09:30", "2026-01-10T00:00", 1),
            ("2026-01-09T09:30", "2026-01-10T23:00", 2),
            ("2026-01-09T11:30", "2026-01-10T00:00", 3),
            ("2026-01-09T11:30", "2026-01-10T23:00", 4),
        ]
    )
    out = fc.select_for_cutoff(runs, DAY, DAY, 9, 50)
    assert out["publish_time"].tolist() == [ts("2026-01-09T09:30")] * 2


def test_cutoff_is_london_time_across_dst():
    targets = pd.Series(
        [
            ts("2026-01-10T12:00"),  # GMT: 09:50 London = 09:50 UTC on 9 Jan
            ts("2026-03-30T12:00"),  # D-1 is 29 Mar (clocks go forward): 09:50 BST = 08:50 UTC
            ts("2026-03-29T23:30"),  # = 00:30 BST on 30 Mar, so D-1 is still 29 Mar
            ts("2026-10-26T12:00"),  # D-1 is 25 Oct (clocks go back): 09:50 GMT = 09:50 UTC
        ]
    )
    got = fc.decision_cutoffs(targets, 9, 50).tolist()
    assert got == [
        ts("2026-01-09T09:50"),
        ts("2026-03-29T08:50"),
        ts("2026-03-29T08:50"),
        ts("2026-10-25T09:50"),
    ]


def _reference_cutoff(target: pd.Timestamp, hh: int, mm: int) -> pd.Timestamp:
    """Independent zoneinfo implementation of 'HH:MM London on D-1'."""
    wall = datetime.combine(target.tz_convert(LONDON).date() - timedelta(days=1), time(hh, mm))
    utc = wall.replace(tzinfo=LONDON).astimezone(timezone.utc)  # fold=0: earlier instant if ambiguous
    if utc.astimezone(LONDON).replace(tzinfo=None) != wall:  # spring-forward gap: first valid instant
        utc = wall.replace(hour=2, minute=0, tzinfo=LONDON).astimezone(timezone.utc)
    return pd.Timestamp(utc)


@pytest.mark.parametrize("hh,mm", [(0, 0), (1, 30), (9, 50), (23, 59)])
def test_cutoffs_match_zoneinfo_for_every_hour_of_2026(hh, mm):
    targets = pd.Series(pd.date_range("2026-01-01", "2027-01-01", freq="1h", tz="UTC", inclusive="left"))
    got = fc.decision_cutoffs(targets, hh, mm)
    expected = pd.Series([_reference_cutoff(t, hh, mm) for t in targets])
    mismatch = targets[got.values != expected.values]
    assert mismatch.empty, f"{len(mismatch)} mismatches, first at {mismatch.iloc[0]}"


def test_horizon_mode_requires_minimum_lead_time():
    out = fc.select_for_horizon(RUNS, DAY, DAY, 3)  # published <= 09:00 on the 10th
    assert out.iloc[0].publish_time == ts("2026-01-09T11:30")
    out0 = fc.select_for_horizon(RUNS, DAY, DAY, 0)
    assert out0.iloc[0].forecast_mw == 1400
    assert out0.iloc[0].horizon_hours == 0.5
    out48 = fc.select_for_horizon(RUNS, DAY, DAY, 48)
    assert out48.empty  # nothing published 48h before


def test_join_matches_exact_hour_and_uses_forecast_minus_actual():
    selected = fc.select_for_cutoff(RUNS, DAY, DAY, 9, 50)
    acts = actuals([("2026-01-10T12:00", 1000), ("2026-01-10T12:30", 5000)])
    joined = fc.join_actuals(selected, acts)
    assert len(joined) == 1
    assert joined.iloc[0].error_mw == 100  # 1100 forecast - 1000 actual


def test_window_uses_london_dates():
    runs = forecasts(
        [
            ("2026-01-08T09:30", "2026-01-09T23:00", 1),
            ("2026-01-09T09:30", "2026-01-10T00:00", 2),
        ]
    )
    out = fc.select_for_cutoff(runs, DAY, DAY, 9, 50)
    assert out["start_time"].tolist() == [ts("2026-01-10T00:00")]


def test_all_runs_excludes_forecasts_published_after_target():
    acts = actuals([(TARGET, 1000)])
    runs = fc.all_runs_joined(
        pd.concat([RUNS, forecasts([("2026-01-10T13:30", TARGET, 9)])]), acts, DAY, DAY
    )
    assert len(runs) == 5
    assert runs["horizon_hours"].min() == 0.5
