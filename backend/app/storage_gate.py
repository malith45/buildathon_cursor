"""FastAPI dependency: auth and chat routes require configured GCS."""

from fastapi import HTTPException

from app.config import get_settings

STORAGE_DISABLED_MSG = (
    "Account features require cloud storage. Set STORAGE_ENABLED=true and "
    "configure GCS_BUCKET in backend/.env."
)

STORAGE_NOT_CONFIGURED_MSG = (
    "Cloud storage is not configured. Set GCS_BUCKET and credentials in "
    "backend/.env (see README Storage setup)."
)


def require_storage() -> None:
    settings = get_settings()
    if not settings.STORAGE_ENABLED:
        raise HTTPException(status_code=503, detail=STORAGE_DISABLED_MSG)
    if not settings.storage_configured:
        raise HTTPException(status_code=503, detail=STORAGE_NOT_CONFIGURED_MSG)
