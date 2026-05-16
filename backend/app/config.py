from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    GEMINI_API_KEY: str = ""
    # Optional: force one model (e.g. gemini-2.0-flash-lite) to save quota
    GEMINI_MODEL: str = ""
    # False = one model per chat/probe (saves quota). True = try all fallbacks.
    GEMINI_TRY_ALL_MODELS: bool = False
    GEMINI_DECISION_RETRIES: int = 1
    # False = no live API call on server start (use for pytest / quota saving)
    GEMINI_PROBE_ON_STARTUP: bool = True
    PORT: int = 4000
    CORS_ORIGIN: str = "http://localhost:3000"
    AUTH_SECRET: str = "dev-only-change-in-production-buildathon"
    APP_ENV: str = "development"
    # Hard safety switch: destructive DB reset for tests only.
    ALLOW_TEST_DATA_RESET: bool = False

    # Set false to run without Supabase (health/decision still work; auth/DB features off)
    DATABASE_ENABLED: bool = True
    DATABASE_CONNECT_TIMEOUT: int = 25

    # Preferred: paste Session pooler URI from Supabase → Database → Connect
    DATABASE_URL: str = ""

    # Or set host/user/password separately (session pooler, port 5432)
    DATABASE_HOST: str = ""
    DATABASE_PORT: int = 5432
    DATABASE_NAME: str = "postgres"
    DATABASE_USER: str = ""
    DATABASE_PASSWORD: str = ""

    @property
    def database_configured(self) -> bool:
        if not self.DATABASE_ENABLED:
            return False
        if self.DATABASE_URL.strip():
            return True
        return bool(
            self.DATABASE_HOST.strip()
            and self.DATABASE_USER.strip()
            and self.DATABASE_PASSWORD
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


def assert_gemini_key() -> None:
    if not get_settings().GEMINI_API_KEY.strip():
        raise ValueError("GEMINI_API_KEY is not set in backend/.env")
