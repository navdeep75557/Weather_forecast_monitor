"""CLI: re-fetch the in-scope data from Elexon and rewrite the disk cache (python -m app.refresh)."""

from .config import get_settings
from .data_store import DataStore


def main() -> None:
    store = DataStore(get_settings())
    store.load(refresh=True)
    if store.error:
        raise SystemExit(f"Refresh failed: {store.error}")
    print(f"Cached {len(store.actuals)} actuals and {len(store.forecasts)} forecast rows to {store.settings.data_dir}")


if __name__ == "__main__":
    main()
