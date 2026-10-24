"""API smoke tests against the committed January 2026 data snapshot, plus client retry behaviour."""

from contextlib import contextmanager
from datetime import date, datetime, timezone

import httpx
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.config import Settings
from app.data_store import DataStore
from app.elexon import ElexonClient, ElexonError
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        if not app.state.store.ready:
            pytest.skip("data snapshot not available")
        yield c


def test_health(client):
    body = client.get("/api/health").json()
    assert body["status"] == "ok"
    assert body["actuals_rows"] == 31 * 48


def test_actuals_are_half_hourly(client):
    rows = client.get("/api/actuals", params={"start": "2026-01-05", "end": "2026-01-05"}).json()
    assert len(rows) == 48


def test_cutoff_forecasts_are_d_minus_1(client):
    rows = client.get("/api/forecasts/latest", params={"start": "2026-01-10", "end": "2026-01-10"}).json()
    assert len(rows) == 24
    assert {r["publish_time"] for r in rows} == {"2026-01-09T09:30:00Z"}


def test_metrics_cutoff_mode(client):
    body = client.get("/api/metrics").json()
    assert body["params"]["mode"] == "cutoff"
    assert body["overall"]["n"] == len(body["points"]) > 700
    assert all(14 <= p["horizon_hours"] <= 39 for p in body["points"])
    assert len(body["daily"]) == 31
    assert body["insights"]


def test_metrics_horizon_mode(client):
    body = client.get("/api/metrics", params={"horizon_hours": 6, "include_points": False}).json()
    assert body["params"]["mode"] == "horizon"
    assert body["points"] == []
    assert body["overall"]["n"] > 700


def test_error_by_horizon(client):
    body = client.get("/api/error-by-horizon").json()
    assert len(body["buckets"]) == 8
    assert sum(b["n"] for b in body["buckets"]) > 5000


@pytest.mark.parametrize(
    "params",
    [
        {"start": "2025-12-31"},
        {"end": "2026-02-01"},
        {"start": "2026-01-20", "end": "2026-01-10"},
        {"mode": "horizon"},
        {"horizon_hours": 49},
        {"cutoff_hour": 24},
    ],
)
def test_validation_errors(client, params):
    assert client.get("/api/metrics", params=params).status_code == 422


def test_503_when_data_missing(client):
    store = app.state.store
    with patched(store, actuals=store.actuals.iloc[0:0]):
        assert client.get("/api/metrics").status_code == 503


@contextmanager
def patched(store, **frames):
    """Temporarily replace store DataFrames (clearing the response cache, which is keyed on the data)."""
    saved = {k: getattr(store, k) for k in frames}
    for k, v in frames.items():
        setattr(store, k, v)
    store.cache.clear()
    try:
        yield
    finally:
        for k, v in saved.items():
            setattr(store, k, v)
        store.cache.clear()


def _on_day(df, day: str):
    lo = pd.Timestamp(day, tz="UTC")
    return (df["start_time"] >= lo) & (df["start_time"] < lo + pd.Timedelta(days=1))


def test_responses_are_cached_and_cacheable(client):
    store = app.state.store
    store.cache.clear()
    first = client.get("/api/metrics", params={"start": "2026-01-03", "end": "2026-01-04"})
    assert len(store.cache) == 1
    second = client.get("/api/metrics", params={"start": "2026-01-03", "end": "2026-01-04"})
    assert first.content == second.content and len(store.cache) == 1
    assert "s-maxage" in first.headers["cache-control"]
    assert client.get("/api/health").headers["cache-control"] == "no-store"
    assert client.get("/api/metrics", params={"start": "2026-02-01"}).headers["cache-control"] == "no-store"


def test_large_responses_are_gzipped(client):
    resp = client.get("/api/metrics", headers={"Accept-Encoding": "gzip"})
    assert resp.headers["content-encoding"] == "gzip"
    assert int(resp.headers["content-length"]) < len(resp.content) / 3


def test_zero_actuals_do_not_break_metrics(client):
    store = app.state.store
    zeroed = store.actuals.copy()
    zeroed.loc[_on_day(zeroed, "2026-01-10"), "actual_mw"] = 0.0
    with patched(store, actuals=zeroed):
        day = client.get("/api/metrics", params={"start": "2026-01-10", "end": "2026-01-10"})
        span = client.get("/api/metrics", params={"start": "2026-01-09", "end": "2026-01-11"}).json()["overall"]
    assert day.status_code == 200
    assert day.json()["overall"]["mape"] is None and day.json()["overall"]["mae"] > 0
    assert span["mape_n"] == span["n"] - 24  # zero-actual hours excluded from MAPE only


def test_range_without_forecasts_returns_empty_metrics(client):
    store = app.state.store
    with patched(store, forecasts=store.forecasts[~_on_day(store.forecasts, "2026-01-10")]):
        body = client.get("/api/metrics", params={"start": "2026-01-10", "end": "2026-01-10"}).json()
        latest = client.get("/api/forecasts/latest", params={"start": "2026-01-10", "end": "2026-01-10"}).json()
        buckets = client.get("/api/error-by-horizon", params={"start": "2026-01-10", "end": "2026-01-10"}).json()["buckets"]
    assert body["overall"]["n"] == 0 and body["points"] == [] and body["daily"] == []
    assert body["insights"][0]["text"].startswith("No forecast")
    assert latest == [] and all(b["n"] == 0 for b in buckets)


def test_missing_forecasts_are_reported_in_coverage(client):
    cov = client.get("/api/metrics", params={"horizon_hours": 48, "include_points": False}).json()["coverage"]
    assert cov["target_hours"] == 744
    assert cov["with_forecast"] == cov["matched_with_actual"] < 744  # runs don't reach 48h ahead for late hours


def test_elexon_outage_degrades_health_and_returns_503(client, tmp_path, monkeypatch):
    def down(*_args, **_kwargs):
        raise ElexonError("Elexon down")

    monkeypatch.setattr(ElexonClient, "fetch_actuals", down)
    store = DataStore(Settings(data_dir=tmp_path))  # empty dir: no snapshot to fall back on
    store.load()
    assert not store.ready and "Elexon down" in store.error
    real = app.state.store
    app.state.store = store
    try:
        health = client.get("/api/health").json()
        resp = client.get("/api/metrics")
    finally:
        app.state.store = real
    assert health["status"] == "degraded" and "Elexon down" in health["error"]
    assert resp.status_code == 503 and "Elexon down" in resp.json()["detail"]


def _client(handler) -> ElexonClient:
    http = httpx.Client(transport=httpx.MockTransport(handler))
    return ElexonClient("https://x.test", max_retries=3, http=http, sleep=lambda _: None)


def test_client_retries_then_succeeds():
    calls = []

    def handler(request):
        calls.append(request)
        if len(calls) < 3:
            return httpx.Response(503)
        row = {"startTime": "2026-01-01T00:00:00Z", "publishTime": "2026-01-01T00:30:00Z", "fuelType": "WIND", "generation": 5}
        return httpx.Response(200, json=[row])

    df = _client(handler).fetch_actuals(date(2026, 1, 1), date(2026, 1, 1))
    assert len(calls) == 3 and df["actual_mw"].tolist() == [5.0]


def test_client_fails_fast_on_4xx():
    calls = []

    def handler(request):
        calls.append(request)
        return httpx.Response(400, text="bad")

    with pytest.raises(ElexonError):
        _client(handler).fetch_actuals(date(2026, 1, 1), date(2026, 1, 1))
    assert len(calls) == 1


def test_client_gives_up_after_repeated_timeouts():
    calls = []

    def handler(request):
        calls.append(request)
        raise httpx.ReadTimeout("timed out", request=request)

    with pytest.raises(ElexonError, match="after 4 attempts"):
        _client(handler).fetch_forecasts(datetime(2026, 1, 1, tzinfo=timezone.utc), datetime(2026, 1, 2, tzinfo=timezone.utc))
    assert len(calls) == 4  # 1 try + 3 retries


def test_client_chunks_by_week():
    seen = []

    def handler(request):
        seen.append(dict(request.url.params))
        return httpx.Response(200, json=[])

    _client(handler).fetch_actuals(date(2026, 1, 1), date(2026, 1, 31))
    assert [p["settlementDateFrom"] for p in seen] == ["2026-01-01", "2026-01-08", "2026-01-15", "2026-01-22", "2026-01-29"]
    assert seen[-1]["settlementDateTo"] == "2026-01-31"
