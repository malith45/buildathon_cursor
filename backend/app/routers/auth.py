import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError

from app.db.errors import is_database_unavailable
from app.dependencies import get_current_user_id
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    ProfileUpdateRequest,
    SignupRequest,
    UserResponse,
)
from app.services import auth_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

DB_UNAVAILABLE = (
    "Database is unavailable. Check DATABASE_* in backend/.env and that "
    "Supabase is reachable (Session pooler, port 5432)."
)


def _raise_auth_error(exc: Exception) -> None:
    if isinstance(exc, auth_service.AuthError):
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    if isinstance(exc, ValidationError):
        raise HTTPException(
            status_code=400,
            detail={"error": "Validation failed", "details": exc.errors()},
        ) from exc
    if is_database_unavailable(exc):
        raise HTTPException(status_code=503, detail=DB_UNAVAILABLE) from exc
    logger.exception("Auth request failed")
    raise HTTPException(
        status_code=500, detail="An unexpected error occurred."
    ) from exc


@router.post("/signup", response_model=AuthResponse, status_code=201)
def post_signup(body: SignupRequest) -> AuthResponse:
    try:
        user, token = auth_service.signup(body.email, body.password, body.name)
        return AuthResponse(user=user, token=token)
    except Exception as exc:
        _raise_auth_error(exc)


@router.post("/login", response_model=AuthResponse)
def post_login(body: LoginRequest) -> AuthResponse:
    try:
        user, token = auth_service.login(body.email, body.password)
        return AuthResponse(user=user, token=token)
    except Exception as exc:
        _raise_auth_error(exc)


@router.get("/me", response_model=UserResponse)
def get_me(user_id: str = Depends(get_current_user_id)) -> UserResponse:
    try:
        user = auth_service.get_user_by_id(user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return UserResponse(user=user)
    except HTTPException:
        raise
    except Exception as exc:
        _raise_auth_error(exc)


@router.patch("/profile", response_model=UserResponse)
def patch_profile(
    body: ProfileUpdateRequest,
    user_id: str = Depends(get_current_user_id),
) -> UserResponse:
    try:
        user = auth_service.update_user_profile(
            user_id,
            name=body.name,
            health_profile=body.healthProfile,
        )
        return UserResponse(user=user)
    except Exception as exc:
        _raise_auth_error(exc)
