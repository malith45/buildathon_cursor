from datetime import datetime, timezone
from uuid import UUID

from psycopg2.extras import Json

from app.db.connection import dict_cursor, get_connection


def _parse_updated_at(value: object) -> str:
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    return str(value)


def _row_to_session(row: dict) -> dict:
    last_decision = row.get("last_decision")
    return {
        "id": str(row["id"]),
        "title": row["title"],
        "messages": row["messages"] or [],
        "lastDecision": last_decision,
        "updatedAt": _parse_updated_at(row["updated_at"]),
    }


def list_sessions_for_user(user_id: str) -> list[dict]:
    with get_connection() as conn:
        with dict_cursor(conn) as cur:
            cur.execute(
                """
                SELECT id, title, messages, last_decision, updated_at
                FROM public.chat_sessions
                WHERE user_id = %s::uuid
                ORDER BY updated_at DESC
                """,
                (user_id,),
            )
            rows = cur.fetchall()
    return [_row_to_session(row) for row in rows]


def sync_sessions_for_user(user_id: str, sessions: list[dict]) -> list[dict]:
    """Upsert provided sessions for user without deleting other rows."""
    with get_connection() as conn:
        with dict_cursor(conn) as cur:
            keep_ids: list[str] = []
            for session in sessions:
                session_id = session["id"]
                try:
                    UUID(session_id)
                except ValueError:
                    continue
                keep_ids.append(session_id)
                messages_json = Json(session.get("messages") or [])
                decision = session.get("lastDecision")
                decision_json = Json(decision) if decision is not None else None
                updated_at = session.get("updatedAt")
                cur.execute(
                    """
                    INSERT INTO public.chat_sessions (
                        id, user_id, title, messages, last_decision, updated_at
                    )
                    VALUES (%s::uuid, %s::uuid, %s, %s, %s, %s::timestamptz)
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        messages = EXCLUDED.messages,
                        last_decision = EXCLUDED.last_decision,
                        updated_at = EXCLUDED.updated_at
                    WHERE public.chat_sessions.user_id = EXCLUDED.user_id
                    """,
                    (
                        session_id,
                        user_id,
                        session["title"],
                        messages_json,
                        decision_json,
                        updated_at,
                    ),
                )

            # Intentionally no implicit delete here.
            # Deletions must happen through explicit delete endpoints/actions.
    return list_sessions_for_user(user_id)


def delete_all_for_user(user_id: str) -> None:
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM public.chat_sessions WHERE user_id = %s::uuid",
                (user_id,),
            )
