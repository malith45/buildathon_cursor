from fastapi import APIRouter, HTTPException, Query

from app.storage import diseases_store

router = APIRouter(prefix="/diseases", tags=["diseases"])


@router.get("")
def list_diseases(
    search: str = Query("", max_length=100),
    limit: int = Query(20, ge=1, le=50),
) -> dict:
    if len(search.strip()) < 2 and search.strip():
        return {"diseases": []}
    try:
        diseases = diseases_store.search_diseases(search, limit)
        return {"diseases": diseases}
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail="Could not load diseases from storage.",
        ) from exc
