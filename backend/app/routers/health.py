import logging

from fastapi import APIRouter, HTTPException, Query

from app.config import assert_openai_key, get_settings
from app.schemas.health import DecisionRequest, HealthDecisionResponse
from app.services import health_decision_service
from app.services.decision_errors import DecisionInfraError
from app.services import openai_service
from app.storage import client as storage_client
from app.storage import diseases_store
from app.storage import health_state
from app.storage.errors import is_storage_unavailable

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/health", tags=["health"])


def _storage_status() -> tuple[bool, bool, str | None]:
    settings = get_settings()
    if not settings.STORAGE_ENABLED:
        return False, False, "Storage disabled (STORAGE_ENABLED=false)"
    if not settings.storage_configured:
        return False, False, "Set GCS_BUCKET in backend/.env"
    if not storage_client.can_attempt_storage():
        return True, False, storage_client.storage_health_hint()[:200]

    cached_connected, cached_message = health_state.storage_startup_status()
    if cached_connected is True:
        return True, True, cached_message or "Storage ready"
    if cached_connected is False and cached_message:
        return True, False, cached_message

    try:
        storage_client.storage_ping()
        health_state.set_storage_startup_result(True, "Storage ready")
        return True, True, "Storage ready"
    except Exception:
        hint = storage_client.storage_health_hint()[:200]
        health_state.set_storage_startup_result(False, hint)
        return True, False, hint


@router.post("/init-storage")
def post_init_storage() -> dict:
    """Verify bucket access and seed the disease catalog (local dev helper)."""
    settings = get_settings()
    if settings.is_production and not settings.ALLOW_TEST_DATA_RESET:
        raise HTTPException(
            status_code=403,
            detail="init-storage is disabled in production.",
        )
    if not settings.storage_configured:
        raise HTTPException(
            status_code=503,
            detail="GCS_BUCKET not configured in backend/.env",
        )
    try:
        storage_client.init_storage()
        health_state.set_storage_startup_result(True, "Storage ready")
        return {
            "status": "ok",
            "diseasesReady": diseases_store.catalog_ready(),
        }
    except Exception as exc:
        health_state.set_storage_startup_result(
            False, storage_client.storage_health_hint()[:200]
        )
        if is_storage_unavailable(exc):
            raise HTTPException(
                status_code=503,
                detail=storage_client.storage_health_hint(),
            ) from exc
        raise HTTPException(status_code=500, detail=str(exc)[:200]) from exc


@router.get("")
def health_check(probe: bool = Query(False)) -> dict:
    settings = get_settings()
    storage_configured, storage_connected, storage_message = _storage_status()
    diseases_ready = diseases_store.catalog_ready()

    payload: dict = {
        "status": "ok",
        "aiConfigured": bool(settings.OPENAI_API_KEY.strip()),
        "aiModel": settings.OPENAI_MODEL,
        "storageConfigured": storage_configured,
        "storageConnected": storage_connected,
        "storageMessage": storage_message,
        "storageBucket": (
            settings.GCS_BUCKET
            if storage_configured and not settings.is_production
            else None
        ),
        "diseasesReady": diseases_ready,
    }
    if probe:
        payload["openai"] = openai_service.probe_openai()
    return payload


@router.post("/decision", response_model=HealthDecisionResponse)
def post_decision(body: DecisionRequest) -> HealthDecisionResponse:
    try:
        assert_openai_key()
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    try:
        result = health_decision_service.decide(body.profile, body.messages)
        return HealthDecisionResponse.model_validate(result.model_dump())
    except DecisionInfraError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception:
        logger.exception("Unexpected error in POST /api/health/decision")
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred.",
        ) from None
