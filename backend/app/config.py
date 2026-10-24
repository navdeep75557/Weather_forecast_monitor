"""Application settings (env vars) and fixed analysis scope."""

from datetime import date, datetime, timezone
from functools import lru_cache
from pathlib import Path
from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict

LONDON = ZoneInfo("Europe/London")

# Analysis scope: target times in January 2026 (London local dates, inclusive).
SCOPE_START = date(2026, 1, 1)
SCOPE_END = date(2026, 1, 31)

# Forecast publish window to fetch: early enough to cover 48h+ horizons for 1 Jan targets.
FORECAST_PUBLISH_FROM = datetime(2025, 12, 28, tzinfo=timezone.utc)
FORECAST_PUBLISH_TO = datetime(2026, 2, 1, tzinfo=timezone.utc)


class Settings(BaseSettings):
    """Runtime configuration, overridable via environment variables or a .env file."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    elexon_base_url: str = "https://data.elexon.co.uk/bmrs/api/v1"
    data_dir: Path = Path(__file__).resolve().parent.parent / "data"
    allowed_origins: str = "http://localhost:5173,http://localhost:3000"
    refresh_on_startup: bool = False
    request_timeout_s: float = 30.0
    max_retries: int = 4
    default_cutoff_hour: int = 9
    default_cutoff_minute: int = 50
    mape_min_actual_mw: float = 1.0

    @property
    def origins(self) -> list[str]:
        """CORS origins as a list ("*" allows any origin)."""
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance."""
    return Settings()
