"""Chat sessions stored as one JSON blob per session.

    chats/{user_id}/{chat_id}.json
"""

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from app.storage import client

logger = logging.getLogger(__name__)


def _chat_dir(user_id: str) -> str:
    return f"chats/{user_id}/"


def _chat_path(user_id: str, chat_id: str) -> str:
    return f"{_chat_dir(user_id)}{chat_id}.json"


def _is_valid_uuid(value: str) -> bool:
    try:
        UUID(value)
        return True
    except (ValueError, TypeError):
        return False


def _payload_to_session(raw: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(raw["id"]),
        "title": raw.get("title", ""),
        "messages": raw.get("messages") or [],
        "lastDecision": raw.get("lastDecision"),
        "updatedAt": str(raw.get("updatedAt") or ""),
    }


def list_sessions_for_user(user_id: str) -> list[dict[str, Any]]:
    sessions: list[dict[str, Any]] = []
    for blob_name in client.list_prefix(_chat_dir(user_id)):
        data, _ = client.read_json(blob_name)
        if isinstance(data, dict):
            sessions.append(_payload_to_session(data))
    # Newest first by updatedAt (ISO 8601 sorts lexicographically).
    sessions.sort(key=lambda s: s.get("updatedAt", ""), reverse=True)
    return sessions


def upsert_sessions_for_user(
    user_id: str, sessions: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Upsert sessions without re-listing the whole prefix from GCS."""
    now_iso = datetime.now(timezone.utc).isoformat()
    written: list[dict[str, Any]] = []
    for session in sessions:
        session_id = str(session.get("id", ""))
        if not _is_valid_uuid(session_id):
            continue
        payload = {
            "id": session_id,
            "title": session.get("title") or "Untitled chat",
            "messages": session.get("messages") or [],
            "lastDecision": session.get("lastDecision"),
            "updatedAt": session.get("updatedAt") or now_iso,
        }
        client.write_json(_chat_path(user_id, session_id), payload)
        written.append(_payload_to_session(payload))
    written.sort(key=lambda s: s.get("updatedAt", ""), reverse=True)
    return written


def sync_sessions_for_user(
    user_id: str, sessions: list[dict[str, Any]]
) -> list[dict[str, Any]]:
    """Upsert provided sessions for user without deleting other rows."""
    return upsert_sessions_for_user(user_id, sessions)


def upsert_session_for_user(
    user_id: str, session: dict[str, Any]
) -> dict[str, Any]:
    rows = upsert_sessions_for_user(user_id, [session])
    if not rows:
        raise ValueError("Invalid session id")
    return rows[0]


def delete_all_for_user(user_id: str) -> int:
    return client.delete_prefix(_chat_dir(user_id))
