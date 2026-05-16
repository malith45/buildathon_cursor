from fastapi import APIRouter, HTTPException, Query

from app.config import get_settings
from app.db import disease_repository

router = APIRouter(prefix="/diseases", tags=["diseases"])


@router.get("")
def list_diseases(
    search: str = Query("", max_length=100),
    limit: int = Query(20, ge=1, le=50),
) -> dict:
    settings = get_settings()
    if not settings.database_configured:
        raise HTTPException(
            status_code=503,
            detail="Disease catalog requires database configuration.",
        )
    try:
        diseases = disease_repository.search_diseases(search, limit)
        return {"diseases": diseases}
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not load diseases from database.",
        ) from exc
