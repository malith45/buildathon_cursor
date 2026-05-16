import logging

from fastapi import APIRouter, Depends, HTTPException

from app.db import chat_repository
from app.db.errors import is_database_unavailable
from app.dependencies import get_current_user_id
from app.schemas.chat import ChatSessionListResponse, ChatSessionPayload, ChatSyncRequest

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chats", tags=["chats"])

DB_UNAVAILABLE = (
    "Database is unavailable. Check DATABASE_* in backend/.env and Supabase connectivity."
)


def _handle_db_error(exc: Exception) -> None:
    if is_database_unavailable(exc):
        raise HTTPException(status_code=503, detail=DB_UNAVAILABLE) from exc
    logger.exception("Chat request failed")
    raise HTTPException(status_code=500, detail="Could not save chat sessions.") from exc


@router.get("", response_model=ChatSessionListResponse)
def list_chats(user_id: str = Depends(get_current_user_id)) -> ChatSessionListResponse:
    try:
        rows = chat_repository.list_sessions_for_user(user_id)
        return ChatSessionListResponse(
            sessions=[ChatSessionPayload.model_validate(row) for row in rows]
        )
    except Exception as exc:
        _handle_db_error(exc)


@router.put("", response_model=ChatSessionListResponse)
def sync_chats(
    body: ChatSyncRequest,
    user_id: str = Depends(get_current_user_id),
) -> ChatSessionListResponse:
    try:
        payload = [s.model_dump() for s in body.sessions]
        rows = chat_repository.sync_sessions_for_user(user_id, payload)
        return ChatSessionListResponse(
            sessions=[ChatSessionPayload.model_validate(row) for row in rows]
        )
    except Exception as exc:
        _handle_db_error(exc)


@router.delete("", status_code=204)
def clear_chats(user_id: str = Depends(get_current_user_id)) -> None:
    try:
        chat_repository.delete_all_for_user(user_id)
    except Exception as exc:
        _handle_db_error(exc)
