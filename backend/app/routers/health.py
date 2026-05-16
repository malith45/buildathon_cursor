from fastapi import APIRouter, HTTPException, Query

from app.config import assert_gemini_key, get_settings
from app.db.connection import get_connection, init_schema, ping_database
from app.db.errors import is_database_unavailable
from app.schemas.health import DecisionRequest, HealthDecisionResponse
from app.services import gemini_service, health_decision_service

router = APIRouter(prefix="/health", tags=["health"])


def _database_status() -> tuple[bool, bool, str | None]:
    settings = get_settings()
    if not settings.DATABASE_ENABLED:
        return False, False, "Database disabled (DATABASE_ENABLED=false)"
    if not settings.database_configured:
        return False, False, "Set DATABASE_* variables in backend/.env"
    try:
        ping_database()
        return True, True, None
    except Exception as exc:
        return True, False, str(exc)[:200]


def _disease_table_ready() -> bool:
    try:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT to_regclass('public.diseases')")
                row = cur.fetchone()
                if not row or row[0] is None:
                    return False
                cur.execute("SELECT COUNT(*) FROM public.diseases")
                count_row = cur.fetchone()
                return bool(count_row and int(count_row[0]) >= 1)
    except Exception:
        return False


@router.post("/init-db")
def post_init_db() -> dict:
    """Create missing tables and seed diseases (local dev helper)."""
    settings = get_settings()
    if not settings.database_configured:
        raise HTTPException(
            status_code=503,
            detail="DATABASE_* not configured in backend/.env",
        )
    try:
        init_schema()
        return {
            "status": "ok",
            "diseasesReady": _disease_table_ready(),
        }
    except Exception as exc:
        if is_database_unavailable(exc):
            raise HTTPException(
                status_code=503,
                detail="Could not reach Supabase. Check pooler host, port 5432, and password.",
            ) from exc
        raise HTTPException(status_code=500, detail=str(exc)[:200]) from exc


@router.get("")
def health_check(probe: bool = Query(False, description="Run a live Gemini API test")) -> dict:
    settings = get_settings()
    db_configured, db_connected, db_message = _database_status()
    diseases_ready = db_connected and _disease_table_ready()
    payload: dict = {
        "status": "ok",
        "geminiConfigured": bool(settings.GEMINI_API_KEY.strip()),
        "databaseConfigured": db_configured,
        "databaseConnected": db_connected,
        "databaseMessage": db_message,
        "diseasesReady": diseases_ready,
    }
    if probe:
        try:
            payload["gemini"] = gemini_service.probe_gemini()
        except Exception as exc:
            payload["gemini"] = {
                "configured": bool(settings.GEMINI_API_KEY.strip()),
                "working": False,
                "message": str(exc)[:200],
                "model": None,
            }
    return payload


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
