import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ---------- OpenAI ----------
    OPENAI_API_KEY: str = ""
    # gpt-4o-mini is the cheap default (~$0.0004/triage call).
    # Override to gpt-4o / gpt-4.1-mini if you want stronger reasoning.
    OPENAI_MODEL: str = "gpt-4o-mini"
    # Retries inside health_decision_service on non-quota failures.
    OPENAI_DECISION_RETRIES: int = 1
    # Live API probe on backend boot (small request, costs ~$0.00002).
    OPENAI_PROBE_ON_STARTUP: bool = False
    # Hard request timeout for OpenAI calls (seconds).
    OPENAI_TIMEOUT: float = 30.0

    # ---------- Auth / server ----------
    AUTH_SECRET: str = "dev-only-change-in-production-buildathon"
    PORT: int = 4000
    CORS_ORIGIN: str = "http://localhost:3000"
    APP_ENV: str = "development"
    # Hard safety switch: destructive storage reset for tests only.
    ALLOW_TEST_DATA_RESET: bool = False

    # ---------- Google Cloud Storage ----------
    # Set false to run without GCS (decision still works; auth/chat persistence off).
    STORAGE_ENABLED: bool = True
    GCS_BUCKET: str = ""
    # Optional explicit project ID (auto-detected from credentials when blank).
    GCS_PROJECT: str = ""
    # Path to a service-account JSON file. When set, exported to the
    # GOOGLE_APPLICATION_CREDENTIALS env var so google-cloud-storage picks it up.
    # Leave blank to fall back to Application Default Credentials (ADC).
    GOOGLE_APPLICATION_CREDENTIALS: str = ""

    @property
    def storage_configured(self) -> bool:
        return self.STORAGE_ENABLED and bool(self.GCS_BUCKET.strip())

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.strip().lower() in ("production", "prod")

    def validate_production_secrets(self) -> None:
        """Refuse to boot in production with known-insecure defaults."""
        if not self.is_production:
            return
        weak = "dev-only-change-in-production-buildathon"
        if self.AUTH_SECRET.strip() in ("", weak):
            raise RuntimeError(
                "AUTH_SECRET must be set to a long random value when APP_ENV=production."
            )


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    # google-cloud-storage reads GOOGLE_APPLICATION_CREDENTIALS from os.environ,
    # not from pydantic settings. Propagate it once at load time.
    cred_path = settings.GOOGLE_APPLICATION_CREDENTIALS.strip()
    if cred_path and not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = cred_path
    return settings


def assert_openai_key() -> None:
    if not get_settings().OPENAI_API_KEY.strip():
        raise ValueError("OPENAI_API_KEY is not set in backend/.env")
