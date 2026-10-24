"""Bounded LRU cache for serialised API responses (the data is immutable once loaded)."""

from collections import OrderedDict
from collections.abc import Callable, Hashable
from threading import Lock


class ResponseCache:
    """Thread-safe LRU of response bodies keyed by endpoint + query parameters."""

    def __init__(self, maxsize: int = 256) -> None:
        self.maxsize = maxsize
        self._items: OrderedDict[Hashable, bytes] = OrderedDict()
        self._lock = Lock()

    def get_or_set(self, key: Hashable, build: Callable[[], bytes]) -> bytes:
        """Return the cached body for key, building (outside the lock) and storing it on a miss."""
        with self._lock:
            if key in self._items:
                self._items.move_to_end(key)
                return self._items[key]
        body = build()
        with self._lock:
            self._items[key] = body
            self._items.move_to_end(key)
            while len(self._items) > self.maxsize:
                self._items.popitem(last=False)
        return body

    def clear(self) -> None:
        with self._lock:
            self._items.clear()

    def __len__(self) -> int:
        return len(self._items)
