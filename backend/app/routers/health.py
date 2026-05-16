from fastapi import APIRouter, HTTPException, Query

from app.config import assert_openai_key, get_settings
from app.schemas.health import DecisionRequest, HealthDecisionResponse
from app.services import health_decision_service, openai_service
from app.storage import client as storage_client
from app.storage import diseases_store
from app.storage.errors import is_storage_unavailable

router = APIRouter(prefix="/health", tags=["health"])


def _storage_status() -> tuple[bool, bool, str | None]:
    settings = get_settings()
    if not settings.STORAGE_ENABLED:
        return False, False, "Storage disabled (STORAGE_ENABLED=false)"
    if not settings.storage_configured:
        return False, False, "Set GCS_BUCKET in backend/.env"
    try:
        storage_client.storage_ping()
        return True, True, None
    except Exception as exc:
        return True, False, str(exc)[:200]


@router.post("/init-storage")
def post_init_storage() -> dict:
    """Verify bucket access and seed the disease catalog (local dev helper)."""
    settings = get_settings()
    if not settings.storage_configured:
        raise HTTPException(
            status_code=503,
            detail="GCS_BUCKET not configured in backend/.env",
        )
    try:
        storage_client.init_storage()
        return {
            "status": "ok",
            "diseasesReady": diseases_store.catalog_ready(),
        }
    except Exception as exc:
        if is_storage_unavailable(exc):
            raise HTTPException(
                status_code=503,
                detail=storage_client.storage_health_hint(),
            ) from exc
        raise HTTPException(status_code=500, detail=str(exc)[:200]) from exc


@router.get("")
def health_check(
    probe: bool = Query(False, description="Run a live OpenAI API test"),
) -> dict:
    settings = get_settings()
    storage_configured, storage_connected, storage_message = _storage_status()
    diseases_ready = storage_connected and diseases_store.catalog_ready()
    payload: dict = {
        "status": "ok",
        "aiConfigured": bool(settings.OPENAI_API_KEY.strip()),
        "aiModel": settings.OPENAI_MODEL,
        "storageConfigured": storage_configured,
        "storageConnected": storage_connected,
        "storageMessage": storage_message,
        "storageBucket": settings.GCS_BUCKET if storage_configured else None,
        "diseasesReady": diseases_ready,
    }
    if probe:
        try:
            payload["ai"] = openai_service.probe_openai()
        except Exception as exc:
            payload["ai"] = {
                "configured": bool(settings.OPENAI_API_KEY.strip()),
                "working": False,
                "message": str(exc)[:200],
                "model": None,
            }
    return payload


@router.post("/decision", response_model=HealthDecisionResponse)
def post_decision(body: DecisionRequest) -> HealthDecisionResponse:
    try:
        assert_openai_key()
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    try:
        return health_decision_service.decide(body.profile, body.messages)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred.",
        ) from None
