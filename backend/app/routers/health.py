from fastapi import APIRouter, HTTPException

from app.config import assert_gemini_key, get_settings
from app.schemas.health import DecisionRequest, HealthDecisionResponse
from app.services import health_decision_service

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
def health_check() -> dict:
    settings = get_settings()
    return {
        "status": "ok",
        "geminiConfigured": bool(settings.GEMINI_API_KEY.strip()),
    }


@router.post("/decision", response_model=HealthDecisionResponse)
def post_decision(body: DecisionRequest) -> HealthDecisionResponse:
    try:
        assert_gemini_key()
    except ValueError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e

    try:
        return health_decision_service.decide(body.profile, body.messages)
    except Exception:
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred.",
        ) from None
