from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError

from app.dependencies import get_current_user_id
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    ProfileUpdateRequest,
    SignupRequest,
    UserResponse,
)
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


def _auth_http_error(exc: Exception) -> HTTPException:
    if isinstance(exc, auth_service.AuthError):
        return HTTPException(status_code=exc.status_code, detail=exc.message)
    if isinstance(exc, ValidationError):
        return HTTPException(
            status_code=400,
            detail={"error": "Validation failed", "details": exc.errors()},
        )
    return HTTPException(status_code=500, detail="An unexpected error occurred.")


@router.post("/signup", response_model=AuthResponse, status_code=201)
def post_signup(body: SignupRequest) -> AuthResponse:
    try:
        user, token = auth_service.signup(body.email, body.password, body.name)
        return AuthResponse(user=user, token=token)
    except auth_service.AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from e


@router.post("/login", response_model=AuthResponse)
def post_login(body: LoginRequest) -> AuthResponse:
    try:
        user, token = auth_service.login(body.email, body.password)
        return AuthResponse(user=user, token=token)
    except auth_service.AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from e


@router.get("/me", response_model=UserResponse)
def get_me(user_id: str = Depends(get_current_user_id)) -> UserResponse:
    user = auth_service.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(user=user)


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
    except auth_service.AuthError as e:
        raise HTTPException(status_code=e.status_code, detail=e.message) from e
