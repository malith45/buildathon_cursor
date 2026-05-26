import json
import os
import tempfile
from pathlib import Path
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
    # Retries inside health_decision_service on non-quota failures (0 = one attempt only).
    OPENAI_DECISION_RETRIES: int = 1
    # Hard request timeout for OpenAI calls (seconds).
    OPENAI_TIMEOUT: float = 20.0
    # Cap model output size for faster completions.
    OPENAI_MAX_OUTPUT_TOKENS: int = 700
    # Only the last N chat turns are sent to the model (keeps latency stable).
    OPENAI_MAX_CONTEXT_MESSAGES: int = 10
    # Evidence snippets (set false to skip retrieval entirely).
    EVIDENCE_ENABLED: bool = True
    EVIDENCE_MAX_SNIPPETS: int = 2
    # Max POST /api/health/decision calls per client IP per minute.
    DECISION_RATE_LIMIT_PER_MINUTE: int = 30

    # ---------- Auth / server ----------
    AUTH_SECRET: str = "dev-only-change-in-production-buildathon"
    PORT: int = 4000
    CORS_ORIGIN: str = "http://localhost:3000"
    # Comma-separated allowed browser origins (production Netlify URL, previews, etc.).
    # When set, used together with CORS_ORIGIN and local dev defaults.
    CORS_ORIGINS: str = ""
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
    # Render/Railway: paste the full service-account JSON here (easier than secret files).
    GCS_CREDENTIALS_JSON: str = ""

    @property
    def storage_configured(self) -> bool:
        return self.STORAGE_ENABLED and bool(self.GCS_BUCKET.strip())

    @property
    def is_production(self) -> bool:
        return self.APP_ENV.strip().lower() in ("production", "prod")

    def cors_origins_list(self) -> list[str]:
        origins: set[str] = {
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        }
        if self.CORS_ORIGIN.strip():
            origins.add(self.CORS_ORIGIN.strip())
        if self.CORS_ORIGINS.strip():
            for part in self.CORS_ORIGINS.replace(";", ",").split(","):
                o = part.strip()
                if o:
                    origins.add(o)
        return sorted(origins)

    def validate_production_secrets(self) -> None:
        """Refuse to boot in production with known-insecure defaults."""
        if not self.is_production:
            return
        weak = "dev-only-change-in-production-buildathon"
        if self.AUTH_SECRET.strip() in ("", weak):
            raise RuntimeError(
                "AUTH_SECRET must be set to a long random value when APP_ENV=production."
            )


def _materialize_gcs_credentials(settings: Settings) -> None:
    """Set GOOGLE_APPLICATION_CREDENTIALS for google-cloud-storage."""
    json_blob = settings.GCS_CREDENTIALS_JSON.strip()
    if json_blob:
        # Accept raw JSON or a path to a JSON file (some hosts mount secrets as paths).
        if json_blob.startswith("{"):
            payload = json.loads(json_blob)
        else:
            path = Path(os.path.expandvars(os.path.expanduser(json_blob.strip("\"'"))))
            payload = json.loads(path.read_text(encoding="utf-8"))
        fd, tmp_path = tempfile.mkstemp(suffix=".json", prefix="gcs-sa-")
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(payload, handle)
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = tmp_path
        settings.GOOGLE_APPLICATION_CREDENTIALS = tmp_path
        return

    cred_path = settings.GOOGLE_APPLICATION_CREDENTIALS.strip().strip("\"'")
    if not cred_path:
        return
    normalized = os.path.expandvars(os.path.expanduser(cred_path))
    try:
        normalized = str(Path(normalized).resolve())
    except Exception:
        pass
    if Path(normalized).is_file():
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = normalized
        settings.GOOGLE_APPLICATION_CREDENTIALS = normalized


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    _materialize_gcs_credentials(settings)
    return settings


def assert_openai_key() -> None:
    if not get_settings().OPENAI_API_KEY.strip():
        raise ValueError("OPENAI_API_KEY is not set in backend/.env")
