import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError

from app.dependencies import get_current_user_id
from app.storage_gate import STORAGE_NOT_CONFIGURED_MSG, require_storage
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    ProfileUpdateRequest,
    SignupRequest,
    UserResponse,
)
from app.services import auth_service
from app.storage.errors import is_storage_unavailable

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

STORAGE_UNAVAILABLE = (
    "Storage is unavailable. Verify GCS_BUCKET and credentials in backend/.env, "
    "then confirm the bucket exists and is reachable."
)


def _raise_auth_error(exc: Exception) -> None:
    if isinstance(exc, RuntimeError) and "GCS_BUCKET" in str(exc):
        raise HTTPException(
            status_code=503, detail=STORAGE_NOT_CONFIGURED_MSG
        ) from exc
    if isinstance(exc, auth_service.AuthError):
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    if isinstance(exc, ValidationError):
        raise HTTPException(
            status_code=400,
            detail={"error": "Validation failed", "details": exc.errors()},
        ) from exc
    if is_storage_unavailable(exc):
        raise HTTPException(status_code=503, detail=STORAGE_UNAVAILABLE) from exc
    logger.exception("Auth request failed")
    raise HTTPException(
        status_code=500, detail="An unexpected error occurred."
    ) from exc


@router.post(
    "/signup",
    response_model=AuthResponse,
    status_code=201,
    dependencies=[Depends(require_storage)],
)
def post_signup(body: SignupRequest) -> AuthResponse:
    try:
        user, token = auth_service.signup(body.email, body.password, body.name)
        return AuthResponse(user=user, token=token)
    except Exception as exc:
        _raise_auth_error(exc)


@router.post(
    "/login",
    response_model=AuthResponse,
    dependencies=[Depends(require_storage)],
)
def post_login(body: LoginRequest) -> AuthResponse:
    try:
        user, token = auth_service.login(body.email, body.password)
        return AuthResponse(user=user, token=token)
    except Exception as exc:
        _raise_auth_error(exc)


@router.get("/me", response_model=UserResponse, dependencies=[Depends(require_storage)])
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


@router.patch("/profile", response_model=UserResponse, dependencies=[Depends(require_storage)])
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
