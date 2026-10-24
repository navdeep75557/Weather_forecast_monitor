"""Loads Elexon data once, caching it in memory and on disk (gzipped JSON) for fast restarts."""

import gzip
import json
import logging
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from .cache import ResponseCache
from .config import FORECAST_PUBLISH_FROM, FORECAST_PUBLISH_TO, SCOPE_END, SCOPE_START, Settings
from .elexon import ACTUAL_COLUMNS, FORECAST_COLUMNS, ElexonClient
from .forecasting import in_window

log = logging.getLogger(__name__)


def _write(path: Path, df: pd.DataFrame) -> None:
    out = df.copy()
    for col in ("start_time", "publish_time"):
        out[col] = out[col].dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(path, "wt", encoding="utf-8") as fh:
        json.dump(out.to_dict(orient="records"), fh, separators=(",", ":"))


def _read(path: Path, columns: list[str]) -> pd.DataFrame:
    with gzip.open(path, "rt", encoding="utf-8") as fh:
        df = pd.DataFrame(json.load(fh), columns=columns)
    for col in ("start_time", "publish_time"):
        df[col] = pd.to_datetime(df[col], utc=True)
    return df


class DataStore:
    """In-memory holder of January 2026 wind actuals and all forecast runs targeting it."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.actuals = pd.DataFrame(columns=ACTUAL_COLUMNS)
        self.forecasts = pd.DataFrame(columns=FORECAST_COLUMNS)
        self.source: str | None = None
        self.loaded_at: datetime | None = None
        self.error: str | None = None
        self.cache = ResponseCache()

    @property
    def actuals_path(self) -> Path:
        return self.settings.data_dir / "actuals.json.gz"

    @property
    def forecasts_path(self) -> Path:
        return self.settings.data_dir / "forecasts.json.gz"

    @property
    def ready(self) -> bool:
        return not self.actuals.empty and not self.forecasts.empty

    def load(self, refresh: bool = False) -> None:
        """Load from disk cache if present (unless refresh), else fetch from Elexon and write the cache."""
        try:
            if not refresh and self.actuals_path.exists() and self.forecasts_path.exists():
                self.actuals = _read(self.actuals_path, ACTUAL_COLUMNS)
                self.forecasts = _read(self.forecasts_path, FORECAST_COLUMNS)
                self.source = "disk-cache"
            else:
                self._fetch()
                self.source = "elexon"
            self.loaded_at = datetime.now(timezone.utc)
            self.error = None
            self.cache.clear()
            log.info("Loaded %d actuals, %d forecast rows from %s", len(self.actuals), len(self.forecasts), self.source)
        except Exception as exc:  # keep the API up and report the problem via /api/health
            self.error = f"{type(exc).__name__}: {exc}"
            log.exception("Data load failed")

    def _fetch(self) -> None:
        s = self.settings
        client = ElexonClient(s.elexon_base_url, s.request_timeout_s, s.max_retries)
        actuals = in_window(client.fetch_actuals(SCOPE_START, SCOPE_END), SCOPE_START, SCOPE_END)
        forecasts = in_window(client.fetch_forecasts(FORECAST_PUBLISH_FROM, FORECAST_PUBLISH_TO), SCOPE_START, SCOPE_END)
        self.actuals = actuals.reset_index(drop=True)
        self.forecasts = forecasts.reset_index(drop=True)
        try:
            _write(self.actuals_path, self.actuals)
            _write(self.forecasts_path, self.forecasts)
        except OSError:
            log.warning("Could not write disk cache to %s", s.data_dir, exc_info=True)
