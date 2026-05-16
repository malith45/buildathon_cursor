"""GCS client + bucket helpers.

The bucket is shared across all stores. We keep the client cached per-process
so each request reuses the same underlying HTTP session.
"""

import json
import logging
from functools import lru_cache
from typing import Iterable

from google.api_core import exceptions as gapi_exceptions
from google.cloud import storage
from google.cloud.storage import Blob, Bucket, Client

from app.config import get_settings

logger = logging.getLogger(__name__)


# Sentinel used in `write_json(if_generation_match=...)` to mean "must not exist".
IF_DOES_NOT_EXIST = 0


@lru_cache
def _client() -> Client:
    settings = get_settings()
    project = settings.GCS_PROJECT.strip() or None
    # Credentials picked up automatically from GOOGLE_APPLICATION_CREDENTIALS
    # (set in config.get_settings) or Application Default Credentials.
    return storage.Client(project=project)


def get_bucket() -> Bucket:
    settings = get_settings()
    name = settings.GCS_BUCKET.strip()
    if not name:
        raise RuntimeError(
            "GCS_BUCKET is not set in backend/.env. "
            "Create a bucket and put its name in GCS_BUCKET."
        )
    return _client().bucket(name)


def get_blob(path: str) -> Blob:
    return get_bucket().blob(path)


# ---------------------------------------------------------------------------
# JSON read/write helpers with optimistic concurrency.
# ---------------------------------------------------------------------------


def read_json(path: str) -> tuple[dict | list | None, int]:
    """Return (parsed_json, generation). Generation is 0 when blob is missing."""
    blob = get_blob(path)
    try:
        raw = blob.download_as_bytes()
    except gapi_exceptions.NotFound:
        return None, 0
    if not raw:
        return None, blob.generation or 0
    try:
        data = json.loads(raw.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        logger.warning("Corrupt JSON in %s: %s", path, exc)
        return None, blob.generation or 0
    return data, blob.generation or 0


def write_json(
    path: str,
    data: dict | list,
    *,
    if_generation_match: int | None = None,
) -> int:
    """Upload `data` as pretty-printed JSON. Returns the new blob generation.

    Pass `if_generation_match=0` to assert "blob does not exist yet".
    Pass an existing generation to assert "no other writer has updated it".
    """
    blob = get_blob(path)
    body = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=False)
    blob.upload_from_string(
        body,
        content_type="application/json; charset=utf-8",
        if_generation_match=if_generation_match,
    )
    blob.reload()
    return blob.generation or 0


def delete_blob(path: str) -> bool:
    """Delete a single blob. Returns True if it existed."""
    blob = get_blob(path)
    try:
        blob.delete()
        return True
    except gapi_exceptions.NotFound:
        return False


def delete_prefix(prefix: str) -> int:
    """Delete every blob whose name starts with `prefix`. Returns the count."""
    bucket = get_bucket()
    deleted = 0
    blobs: Iterable[Blob] = bucket.list_blobs(prefix=prefix)
    for blob in blobs:
        try:
            blob.delete()
            deleted += 1
        except gapi_exceptions.NotFound:
            continue
    return deleted


def list_prefix(prefix: str) -> list[str]:
    return [blob.name for blob in get_bucket().list_blobs(prefix=prefix)]


# ---------------------------------------------------------------------------
# Health / init.
# ---------------------------------------------------------------------------


def storage_ping() -> None:
    """Raise if the GCS bucket can't be reached or listed.

    Uses a 1-result list rather than bucket.reload(), so the service
    account only needs `storage.objects.list` — covered by
    `roles/storage.objectAdmin`. Avoids requiring the bucket-metadata
    permission `storage.buckets.get`.
    """
    bucket = get_bucket()
    iterator = iter(bucket.list_blobs(max_results=1))
    # Force the HTTP request so auth/existence errors propagate now.
    next(iterator, None)


def storage_health_hint() -> str:
    settings = get_settings()
    name = settings.GCS_BUCKET.strip() or "<unset>"
    return (
        f"Could not reach GCS bucket '{name}'. Verify GCS_BUCKET in backend/.env, "
        "and confirm the service account in GOOGLE_APPLICATION_CREDENTIALS has "
        "storage.objectAdmin on the bucket (or you've run `gcloud auth "
        "application-default login`)."
    )


def init_storage() -> None:
    """Verify bucket access and seed the disease catalog if missing."""
    settings = get_settings()
    if not settings.storage_configured:
        return

    try:
        storage_ping()
    except Exception as exc:
        raise RuntimeError(storage_health_hint()) from exc

    # Late import to avoid circular deps at module load time.
    try:
        from app.storage.diseases_store import seed_diseases_if_needed

        seed_diseases_if_needed()
    except Exception:
        logger.warning(
            "Disease catalog seed skipped (storage reachable but seed failed). "
            "Search will return empty until diseases/catalog.json is created.",
            exc_info=True,
        )
