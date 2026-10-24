"""Elexon BMRS client: weekly-chunked requests with retry and exponential backoff."""

import logging
import random
import time
from collections.abc import Iterator
from datetime import date, datetime, timedelta

import httpx
import pandas as pd

log = logging.getLogger(__name__)

CHUNK = timedelta(days=7)
RETRYABLE_STATUS = {429, 500, 502, 503, 504}

ACTUAL_COLUMNS = ["start_time", "publish_time", "actual_mw"]
FORECAST_COLUMNS = ["start_time", "publish_time", "forecast_mw"]


class ElexonError(RuntimeError):
    """Raised when Elexon data cannot be fetched."""


def date_chunks(start: date, end: date) -> Iterator[tuple[date, date]]:
    """Split an inclusive date range into inclusive chunks of at most 7 days."""
    cur = start
    while cur <= end:
        last = min(cur + CHUNK - timedelta(days=1), end)
        yield cur, last
        cur = last + timedelta(days=1)


def datetime_chunks(start: datetime, end: datetime) -> Iterator[tuple[datetime, datetime]]:
    """Split a [start, end) datetime range into 7-day windows."""
    cur = start
    while cur < end:
        nxt = min(cur + CHUNK, end)
        yield cur, nxt
        cur = nxt


def _iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def actuals_frame(records: list[dict]) -> pd.DataFrame:
    """Normalise FUELHH records to WIND-only actuals, one row per start_time (latest publish wins)."""
    df = pd.DataFrame(records)
    if df.empty:
        return pd.DataFrame(columns=ACTUAL_COLUMNS)
    if "fuelType" in df:
        df = df[df["fuelType"] == "WIND"]
    df = pd.DataFrame(
        {
            "start_time": pd.to_datetime(df["startTime"], utc=True),
            "publish_time": pd.to_datetime(df["publishTime"], utc=True),
            "actual_mw": df["generation"].astype(float),
        }
    )
    df = df.sort_values("publish_time").drop_duplicates("start_time", keep="last")
    return df.sort_values("start_time").reset_index(drop=True)


def forecasts_frame(records: list[dict]) -> pd.DataFrame:
    """Normalise WINDFOR records, one row per (publish_time, start_time)."""
    df = pd.DataFrame(records)
    if df.empty:
        return pd.DataFrame(columns=FORECAST_COLUMNS)
    df = pd.DataFrame(
        {
            "start_time": pd.to_datetime(df["startTime"], utc=True),
            "publish_time": pd.to_datetime(df["publishTime"], utc=True),
            "forecast_mw": df["generation"].astype(float),
        }
    )
    df = df.drop_duplicates(["publish_time", "start_time"], keep="last")
    return df.sort_values(["publish_time", "start_time"]).reset_index(drop=True)


class ElexonClient:
    """Minimal synchronous client for the BMRS stream endpoints used by the app."""

    def __init__(
        self,
        base_url: str,
        timeout_s: float = 30.0,
        max_retries: int = 4,
        http: httpx.Client | None = None,
        sleep=time.sleep,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.max_retries = max_retries
        self._http = http or httpx.Client(timeout=timeout_s)
        self._sleep = sleep

    def _get(self, path: str, params: dict[str, str]) -> list[dict]:
        """GET with retry on network errors, 429 and 5xx; fail fast on other 4xx."""
        url = f"{self.base_url}{path}"
        for attempt in range(self.max_retries + 1):
            try:
                resp = self._http.get(url, params=params)
                if resp.status_code in RETRYABLE_STATUS:
                    raise httpx.HTTPStatusError(
                        f"retryable status {resp.status_code}", request=resp.request, response=resp
                    )
                if resp.status_code >= 400:
                    raise ElexonError(f"Elexon {path} returned {resp.status_code}: {resp.text[:200]}")
                body = resp.json()
                return body if isinstance(body, list) else body.get("data", [])
            except (httpx.TransportError, httpx.HTTPStatusError) as exc:
                if attempt == self.max_retries:
                    raise ElexonError(f"Elexon {path} failed after {attempt + 1} attempts: {exc}") from exc
                delay = min(2**attempt, 30) + random.uniform(0, 0.5)
                log.warning("Elexon %s attempt %d failed (%s); retrying in %.1fs", path, attempt + 1, exc, delay)
                self._sleep(delay)
        raise AssertionError("unreachable")

    def fetch_actuals(self, start: date, end: date) -> pd.DataFrame:
        """FUELHH wind outturn for settlement dates in [start, end], fetched week by week."""
        records: list[dict] = []
        for lo, hi in date_chunks(start, end):
            records += self._get(
                "/datasets/FUELHH/stream",
                {"settlementDateFrom": lo.isoformat(), "settlementDateTo": hi.isoformat(), "fuelType": "WIND"},
            )
        return actuals_frame(records)

    def fetch_forecasts(self, publish_from: datetime, publish_to: datetime) -> pd.DataFrame:
        """WINDFOR forecasts published in [publish_from, publish_to), fetched week by week."""
        records: list[dict] = []
        for lo, hi in datetime_chunks(publish_from, publish_to):
            records += self._get(
                "/datasets/WINDFOR/stream",
                {"publishDateTimeFrom": _iso(lo), "publishDateTimeTo": _iso(hi)},
            )
        df = forecasts_frame(records)
        # publishDateTimeTo may be inclusive; keep the window half-open.
        return df[(df["publish_time"] >= publish_from) & (df["publish_time"] < publish_to)].reset_index(drop=True)
