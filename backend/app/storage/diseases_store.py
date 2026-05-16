"""Disease catalog stored as a single JSON blob.

    diseases/catalog.json    [ {"id": int, "name": str, "category": str | None}, ... ]

The catalog is read-mostly and small (hundreds of entries), so we read it once
per process and cache the result. Search is a case-insensitive contains-match
performed in memory.
"""

import threading
from typing import Any

from app.data.disease_names import DISEASE_CATEGORIES, DISEASE_NAMES
from app.storage import client

CATALOG_PATH = "diseases/catalog.json"
_MIN_CATALOG_SIZE = 50  # if blob has fewer entries we reseed

_cache_lock = threading.Lock()
_cached_catalog: list[dict[str, Any]] | None = None


def _build_seed() -> list[dict[str, Any]]:
    return [
        {"id": idx + 1, "name": name, "category": DISEASE_CATEGORIES.get(name)}
        for idx, name in enumerate(DISEASE_NAMES)
    ]


def _load_catalog() -> list[dict[str, Any]]:
    global _cached_catalog
    if _cached_catalog is not None:
        return _cached_catalog
    with _cache_lock:
        if _cached_catalog is not None:
            return _cached_catalog
        data, _ = client.read_json(CATALOG_PATH)
        if isinstance(data, list) and len(data) >= _MIN_CATALOG_SIZE:
            _cached_catalog = [
                {
                    "id": int(item.get("id") or idx + 1),
                    "name": str(item.get("name", "")),
                    "category": item.get("category"),
                }
                for idx, item in enumerate(data)
                if isinstance(item, dict) and item.get("name")
            ]
        else:
            _cached_catalog = []
    return _cached_catalog


def invalidate_cache() -> None:
    global _cached_catalog
    with _cache_lock:
        _cached_catalog = None


def seed_diseases_if_needed(min_count: int = _MIN_CATALOG_SIZE) -> int:
    """Write the disease catalog to GCS when missing or too small.

    Returns the number of entries written, or 0 if no write was needed.
    """
    data, _ = client.read_json(CATALOG_PATH)
    if isinstance(data, list) and len(data) >= min_count:
        return 0
    seed = _build_seed()
    client.write_json(CATALOG_PATH, seed)
    invalidate_cache()
    return len(seed)


def search_diseases(query: str = "", limit: int = 20) -> list[dict[str, Any]]:
    limit = max(1, min(limit, 50))
    catalog = _load_catalog()
    q = query.strip().lower()
    if not q:
        return sorted(catalog, key=lambda d: d["name"])[:limit]

    matches = [d for d in catalog if q in d["name"].lower()]
    matches.sort(
        key=lambda d: (
            0 if d["name"].lower().startswith(q) else 1,
            d["name"],
        )
    )
    return matches[:limit]


def catalog_ready() -> bool:
    return len(_load_catalog()) >= _MIN_CATALOG_SIZE
