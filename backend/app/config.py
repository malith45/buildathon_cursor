from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    GEMINI_API_KEY: str = ""
    PORT: int = 4000
    CORS_ORIGIN: str = "http://localhost:3000"
    AUTH_SECRET: str = "dev-only-change-in-production-buildathon"


@lru_cache
def get_settings() -> Settings:
    return Settings()


def assert_gemini_key() -> None:
    if not get_settings().GEMINI_API_KEY.strip():
        raise ValueError("GEMINI_API_KEY is not set in backend/.env")
