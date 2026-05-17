"""User records persisted as JSON blobs in GCS.

    users/{user_id}.json            full record (password_hash, profile, ...)
    indexes/users_by_email.json     { "version":1, "by_email": { email: user_id } }

Email uniqueness is enforced via the index file with an optimistic-concurrency
precondition (if_generation_match). Two simultaneous signups for the same email
would result in one of them retrying or failing cleanly.
"""

import logging
import time
from datetime import datetime, timezone
from threading import Lock
from typing import Any
from uuid import uuid4

from google.api_core import exceptions as gapi_exceptions

from app.config import get_settings
from app.schemas.health import HealthProfile
from app.storage import client
from app.storage.errors import StorageConflict

logger = logging.getLogger(__name__)


USERS_PREFIX = "users/"
EMAIL_INDEX_PATH = "indexes/users_by_email.json"
INDEX_VERSION = 1

# In-memory cache of the email→user_id index. Cuts ~200-400 ms off every
# login (1 GCS read instead of 2) and every signup (the duplicate-check read
# is satisfied from cache). Cache is automatically invalidated whenever
# we successfully write the index (insert_user / delete_user / migrations),
# and additionally expires after CACHE_TTL_SECONDS as a safety net for
# multi-process or out-of-band writes.
CACHE_TTL_SECONDS = 30.0
_index_cache_lock = Lock()
_index_cache: dict[str, str] | None = None
_index_cache_generation: int = 0
_index_cache_expires_at: float = 0.0


def _read_cached_index() -> tuple[dict[str, str], int] | None:
    """Return cached (index, generation) if still fresh, else None."""
    with _index_cache_lock:
        if _index_cache is None:
            return None
        if time.monotonic() >= _index_cache_expires_at:
            return None
        # Return a defensive copy so callers can mutate it freely.
        return dict(_index_cache), _index_cache_generation


def _set_cached_index(index: dict[str, str], generation: int) -> None:
    global _index_cache, _index_cache_generation, _index_cache_expires_at
    with _index_cache_lock:
        _index_cache = dict(index)
        _index_cache_generation = generation
        _index_cache_expires_at = time.monotonic() + CACHE_TTL_SECONDS


def _invalidate_cached_index() -> None:
    global _index_cache, _index_cache_generation, _index_cache_expires_at
    with _index_cache_lock:
        _index_cache = None
        _index_cache_generation = 0
        _index_cache_expires_at = 0.0

DEFAULT_PROFILE_JSON: dict[str, Any] = {
    "ageRange": "25-34",
    "conditions": [],
    "allergies": [],
    "medications": "",
}


def _user_path(user_id: str) -> str:
    return f"{USERS_PREFIX}{user_id}.json"


def _parse_profile(data: Any) -> HealthProfile:
    if isinstance(data, dict):
        return HealthProfile.model_validate(data)
    return HealthProfile.model_validate(DEFAULT_PROFILE_JSON)


def _record_to_dict(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(raw["id"]),
        "email": raw["email"],
        "password_hash": raw["password_hash"],
        "name": raw["name"],
        "health_profile": _parse_profile(raw.get("health_profile")),
        "created_at": str(raw["created_at"]),
    }


# ---------------------------------------------------------------------------
# Email index
# ---------------------------------------------------------------------------


def _load_email_index(*, use_cache: bool = True) -> tuple[dict[str, str], int]:
    if use_cache:
        cached = _read_cached_index()
        if cached is not None:
            return cached
    data, generation = client.read_json(EMAIL_INDEX_PATH)
    if not isinstance(data, dict):
        _set_cached_index({}, generation)
        return {}, generation
    by_email = data.get("by_email")
    if not isinstance(by_email, dict):
        _set_cached_index({}, generation)
        return {}, generation
    normalized = {str(k).lower(): str(v) for k, v in by_email.items()}
    _set_cached_index(normalized, generation)
    return normalized, generation


def _save_email_index(
    by_email: dict[str, str], *, expected_generation: int | None
) -> int:
    payload = {
        "version": INDEX_VERSION,
        "by_email": by_email,
    }
    if_generation_match = expected_generation
    if expected_generation == 0:
        # 0 means "blob must not exist yet"
        if_generation_match = client.IF_DOES_NOT_EXIST
    try:
        new_generation = client.write_json(
            EMAIL_INDEX_PATH,
            payload,
            if_generation_match=if_generation_match,
        )
    except gapi_exceptions.PreconditionFailed as exc:
        # Stale cache could have caused this — drop it so the next read
        # goes to GCS.
        _invalidate_cached_index()
        raise StorageConflict("Email index changed during write") from exc
    # Successful write: refresh cache with what we just persisted.
    _set_cached_index(
        {str(k).lower(): str(v) for k, v in by_email.items()},
        new_generation,
    )
    return new_generation


def _add_email_to_index(email: str, user_id: str, *, max_retries: int = 5) -> None:
    normalized = email.strip().lower()
    for attempt in range(max_retries):
        # First attempt may use cached index; on retry, force a fresh read
        # since a stale cache likely caused the write conflict.
        index, generation = _load_email_index(use_cache=attempt == 0)
        existing = index.get(normalized)
        if existing and existing != user_id:
            raise StorageConflict(
                f"Email '{normalized}' is already mapped to a different user"
            )
        index[normalized] = user_id
        try:
            _save_email_index(index, expected_generation=generation)
            return
        except StorageConflict:
            if attempt == max_retries - 1:
                raise
            continue


def _remove_email_from_index(email: str, *, max_retries: int = 5) -> None:
    normalized = email.strip().lower()
    for attempt in range(max_retries):
        index, generation = _load_email_index(use_cache=attempt == 0)
        if normalized not in index:
            return
        index.pop(normalized, None)
        try:
            _save_email_index(index, expected_generation=generation)
            return
        except StorageConflict:
            if attempt == max_retries - 1:
                raise
            continue


# ---------------------------------------------------------------------------
# Public API (mirrors the old db.user_repository surface)
# ---------------------------------------------------------------------------


def find_by_email(email: str) -> dict[str, Any] | None:
    normalized = email.strip().lower()
    index, _ = _load_email_index()
    user_id = index.get(normalized)
    if not user_id:
        return None
    return find_by_id(user_id)


def find_by_id(user_id: str) -> dict[str, Any] | None:
    data, _ = client.read_json(_user_path(user_id))
    if not isinstance(data, dict):
        return None
    return _record_to_dict(data)


def insert_user(
    email: str,
    password_hash: str,
    name: str,
    health_profile: HealthProfile | None = None,
    *,
    user_id: str | None = None,
    created_at: str | None = None,
) -> dict[str, Any]:
    normalized = email.strip().lower()
    existing_index, _ = _load_email_index()
    if normalized in existing_index:
        raise StorageConflict(f"Email '{normalized}' is already registered")

    profile = health_profile or HealthProfile.model_validate(DEFAULT_PROFILE_JSON)
    new_id = user_id or str(uuid4())
    timestamp = created_at or datetime.now(timezone.utc).isoformat()

    payload = {
        "id": new_id,
        "email": normalized,
        "password_hash": password_hash,
        "name": name,
        "health_profile": profile.model_dump(),
        "created_at": timestamp,
    }

    try:
        client.write_json(
            _user_path(new_id),
            payload,
            if_generation_match=client.IF_DOES_NOT_EXIST,
        )
    except gapi_exceptions.PreconditionFailed as exc:
        raise StorageConflict(f"User '{new_id}' already exists") from exc

    try:
        _add_email_to_index(normalized, new_id)
    except StorageConflict:
        # Roll back the user blob so we don't leak an orphan record.
        client.delete_blob(_user_path(new_id))
        raise

    return _record_to_dict(payload)


def update_user(
    user_id: str,
    *,
    name: str | None = None,
    health_profile: HealthProfile | None = None,
) -> dict[str, Any] | None:
    raw, generation = client.read_json(_user_path(user_id))
    if not isinstance(raw, dict):
        return None

    if name is not None:
        raw["name"] = name
    if health_profile is not None:
        raw["health_profile"] = health_profile.model_dump()

    try:
        client.write_json(
            _user_path(user_id),
            raw,
            if_generation_match=generation,
        )
    except gapi_exceptions.PreconditionFailed as exc:
        raise StorageConflict("User record changed during update") from exc

    return _record_to_dict(raw)


def delete_user(user_id: str) -> None:
    raw, _ = client.read_json(_user_path(user_id))
    if isinstance(raw, dict) and raw.get("email"):
        try:
            _remove_email_from_index(str(raw["email"]))
        except StorageConflict:
            logger.warning("Could not update email index while deleting %s", user_id)
    client.delete_blob(_user_path(user_id))
    # Cascade chat sessions for that user.
    client.delete_prefix(f"chats/{user_id}/")


def clear_all_users() -> None:
    """Tests only — wipes users/, indexes/, and chats/."""
    settings = get_settings()
    app_env = settings.APP_ENV.strip().lower()
    if app_env != "test" or not settings.ALLOW_TEST_DATA_RESET:
        raise RuntimeError(
            "Refusing destructive reset outside test mode. "
            "Set APP_ENV=test and ALLOW_TEST_DATA_RESET=true for isolated test storage."
        )
    client.delete_prefix("users/")
    client.delete_prefix("chats/")
    client.delete_blob(EMAIL_INDEX_PATH)
    _invalidate_cached_index()
