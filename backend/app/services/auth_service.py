from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import get_settings
from app.schemas.auth import PublicUser
from app.schemas.health import HealthProfile

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

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


@dataclass
class UserRecord:
    id: str
    email: str
    password_hash: str
    name: str
    health_profile: HealthProfile
    created_at: str


_users_by_id: dict[str, UserRecord] = {}
_users_by_email: dict[str, UserRecord] = {}


def _to_public(user: UserRecord) -> PublicUser:
    return PublicUser(
        id=user.id,
        email=user.email,
        name=user.name,
        healthProfile=user.health_profile,
        createdAt=user.created_at,
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
    if normalized in _users_by_email:
        raise AuthError("An account with this email already exists", 409)

    user = UserRecord(
        id=str(uuid4()),
        email=normalized,
        password_hash=pwd_context.hash(password),
        name=name.strip(),
        health_profile=DEFAULT_HEALTH_PROFILE.model_copy(),
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    _users_by_id[user.id] = user
    _users_by_email[normalized] = user
    return _to_public(user), _sign_token(user.id)


def login(email: str, password: str) -> tuple[PublicUser, str]:
    normalized = email.strip().lower()
    user = _users_by_email.get(normalized)
    if not user or not pwd_context.verify(password, user.password_hash):
        raise AuthError("Invalid email or password", 401)
    return _to_public(user), _sign_token(user.id)


def get_user_by_id(user_id: str) -> PublicUser | None:
    user = _users_by_id.get(user_id)
    return _to_public(user) if user else None


def update_user_profile(
    user_id: str,
    *,
    name: str | None = None,
    health_profile: HealthProfile | None = None,
) -> PublicUser:
    user = _users_by_id.get(user_id)
    if not user:
        raise AuthError("User not found", 404)
    if name is not None:
        user.name = name.strip()
    if health_profile is not None:
        user.health_profile = health_profile
    return _to_public(user)


def clear_users_for_tests() -> None:
    """Reset in-memory store (tests only)."""
    _users_by_id.clear()
    _users_by_email.clear()
