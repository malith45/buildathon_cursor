from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from app.config import get_settings
from app.schemas.auth import PublicUser
from app.schemas.health import HealthProfile
from app.security.passwords import hash_password, verify_password
from app.storage import users_store
from app.storage.errors import StorageConflict

DEFAULT_HEALTH_PROFILE = HealthProfile(
    ageRange="25-34",
    conditions=[],
    allergies=[],
    medications="",
)


class AuthError(Exception):
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _to_public(record: dict) -> PublicUser:
    return PublicUser(
        id=record["id"],
        email=record["email"],
        name=record["name"],
        healthProfile=record["health_profile"],
        createdAt=record["created_at"],
    )


def _sign_token(user_id: str) -> str:
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    payload = {"sub": user_id, "exp": expire}
    return jwt.encode(payload, settings.AUTH_SECRET, algorithm="HS256")


def verify_token(token: str) -> str:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.AUTH_SECRET, algorithms=["HS256"])
        sub = payload.get("sub")
        if not sub or not isinstance(sub, str):
            raise AuthError("Invalid or expired session", 401)
        return sub
    except JWTError:
        raise AuthError("Invalid or expired session", 401)


def signup(email: str, password: str, name: str) -> tuple[PublicUser, str]:
    normalized = email.strip().lower()
    if users_store.find_by_email(normalized):
        raise AuthError("An account with this email already exists", 409)

    try:
        record = users_store.insert_user(
            email=normalized,
            password_hash=hash_password(password),
            name=name.strip(),
            health_profile=DEFAULT_HEALTH_PROFILE.model_copy(),
        )
    except StorageConflict as exc:
        raise AuthError("An account with this email already exists", 409) from exc
    return _to_public(record), _sign_token(record["id"])


def login(email: str, password: str) -> tuple[PublicUser, str]:
    normalized = email.strip().lower()
    record = users_store.find_by_email(normalized)
    if not record or not verify_password(password, record["password_hash"]):
        raise AuthError("Invalid email or password", 401)
    return _to_public(record), _sign_token(record["id"])


def get_user_by_id(user_id: str) -> PublicUser | None:
    record = users_store.find_by_id(user_id)
    return _to_public(record) if record else None


def update_user_profile(
    user_id: str,
    *,
    name: str | None = None,
    health_profile: HealthProfile | None = None,
) -> PublicUser:
    try:
        record = users_store.update_user(
            user_id,
            name=name.strip() if name is not None else None,
            health_profile=health_profile,
        )
    except StorageConflict as exc:
        raise AuthError(
            "Profile was modified elsewhere — please refresh and try again.",
            409,
        ) from exc
    if not record:
        raise AuthError("User not found", 404)
    return _to_public(record)


def clear_users_for_tests() -> None:
    """Reset store (tests only, requires GCS)."""
    users_store.clear_all_users()
