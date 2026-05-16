from pydantic import BaseModel, EmailStr, Field

from app.schemas.health import HealthProfile


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=1, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class ProfileUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    healthProfile: HealthProfile | None = None


class PublicUser(BaseModel):
    id: str
    email: str
    name: str
    healthProfile: HealthProfile
    createdAt: str


class AuthResponse(BaseModel):
    user: PublicUser
    token: str


class UserResponse(BaseModel):
    user: PublicUser
