import json
from datetime import datetime, timezone
from uuid import uuid4

from app.config import get_settings
from app.db.connection import dict_cursor, get_connection
from app.schemas.health import HealthProfile

DEFAULT_PROFILE_JSON = {
    "ageRange": "25-34",
    "conditions": [],
    "allergies": [],
    "medications": "",
}


def _parse_profile(data: object) -> HealthProfile:
    if isinstance(data, dict):
        return HealthProfile.model_validate(data)
    if isinstance(data, str):
        return HealthProfile.model_validate(json.loads(data))
    return HealthProfile.model_validate(DEFAULT_PROFILE_JSON)


def _row_to_record(row: dict) -> dict:
    created = row["created_at"]
    if isinstance(created, datetime):
        created_at = created.astimezone(timezone.utc).isoformat()
    else:
        created_at = str(created)
    return {
        "id": str(row["id"]),
        "email": row["email"],
        "password_hash": row["password_hash"],
        "name": row["name"],
        "health_profile": _parse_profile(row["health_profile"]),
        "created_at": created_at,
    }


def find_by_email(email: str) -> dict | None:
    with get_connection() as conn:
        with dict_cursor(conn) as cur:
            cur.execute(
                "SELECT * FROM public.users WHERE email = %s",
                (email,),
            )
            row = cur.fetchone()
    return _row_to_record(row) if row else None


def find_by_id(user_id: str) -> dict | None:
    with get_connection() as conn:
        with dict_cursor(conn) as cur:
            cur.execute(
                "SELECT * FROM public.users WHERE id = %s::uuid",
                (user_id,),
            )
            row = cur.fetchone()
    return _row_to_record(row) if row else None


def insert_user(
    email: str,
    password_hash: str,
    name: str,
    health_profile: HealthProfile | None = None,
) -> dict:
    profile = health_profile or HealthProfile.model_validate(DEFAULT_PROFILE_JSON)
    user_id = str(uuid4())
    profile_json = json.dumps(profile.model_dump())
    with get_connection() as conn:
        with dict_cursor(conn) as cur:
            cur.execute(
                """
                INSERT INTO public.users (id, email, password_hash, name, health_profile)
                VALUES (%s::uuid, %s, %s, %s, %s::jsonb)
                RETURNING *
                """,
                (user_id, email, password_hash, name, profile_json),
            )
            row = cur.fetchone()
    if not row:
        raise RuntimeError("Failed to create user")
    return _row_to_record(row)


def update_user(
    user_id: str,
    *,
    name: str | None = None,
    health_profile: HealthProfile | None = None,
) -> dict | None:
    sets: list[str] = []
    params: list[object] = []
    if name is not None:
        sets.append("name = %s")
        params.append(name)
    if health_profile is not None:
        sets.append("health_profile = %s::jsonb")
        params.append(json.dumps(health_profile.model_dump()))
    if not sets:
        return find_by_id(user_id)
    params.append(user_id)
    sql = f"UPDATE public.users SET {', '.join(sets)} WHERE id = %s::uuid RETURNING *"
    with get_connection() as conn:
        with dict_cursor(conn) as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
    return _row_to_record(row) if row else None


def clear_all_users() -> None:
    """Tests only."""
    settings = get_settings()
    app_env = settings.APP_ENV.strip().lower()
    if app_env != "test" or not settings.ALLOW_TEST_DATA_RESET:
        raise RuntimeError(
            "Refusing destructive reset outside test mode. "
            "Set APP_ENV=test and ALLOW_TEST_DATA_RESET=true for isolated test DB only."
        )
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE public.chat_sessions, public.users CASCADE")
