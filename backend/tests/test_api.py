"""API smoke tests against the committed January 2026 data snapshot, plus client retry behaviour."""

from datetime import date

import httpx
import pytest
from fastapi.testclient import TestClient

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
    saved = store.actuals
    store.actuals = store.actuals.iloc[0:0]
    try:
        assert client.get("/api/metrics").status_code == 503
    finally:
        store.actuals = saved


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


def test_client_chunks_by_week():
    seen = []

    def handler(request):
        seen.append(dict(request.url.params))
        return httpx.Response(200, json=[])

    _client(handler).fetch_actuals(date(2026, 1, 1), date(2026, 1, 31))
    assert [p["settlementDateFrom"] for p in seen] == ["2026-01-01", "2026-01-08", "2026-01-15", "2026-01-22", "2026-01-29"]
    assert seen[-1]["settlementDateTo"] == "2026-01-31"
