import logging

from fastapi import APIRouter, Depends, HTTPException

from app.dependencies import get_current_user_id
from app.storage_gate import require_storage
from app.schemas.chat import ChatSessionListResponse, ChatSessionPayload, ChatSyncRequest
from app.storage import chats_store
from app.storage.errors import is_storage_unavailable

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chats", tags=["chats"])

STORAGE_UNAVAILABLE = (
    "Storage is unavailable. Verify GCS_BUCKET and credentials in backend/.env."
)


def _handle_storage_error(exc: Exception) -> None:
    if isinstance(exc, RuntimeError) and "GCS_BUCKET" in str(exc):
        from app.storage_gate import STORAGE_NOT_CONFIGURED_MSG

        raise HTTPException(
            status_code=503, detail=STORAGE_NOT_CONFIGURED_MSG
        ) from exc
    if is_storage_unavailable(exc):
        raise HTTPException(status_code=503, detail=STORAGE_UNAVAILABLE) from exc
    logger.exception("Chat request failed")
    raise HTTPException(status_code=500, detail="Could not save chat sessions.") from exc


@router.get(
    "",
    response_model=ChatSessionListResponse,
    dependencies=[Depends(require_storage)],
)
def list_chats(user_id: str = Depends(get_current_user_id)) -> ChatSessionListResponse:
    try:
        rows = chats_store.list_sessions_for_user(user_id)
        return ChatSessionListResponse(
            sessions=[ChatSessionPayload.model_validate(row) for row in rows]
        )
    except Exception as exc:
        _handle_storage_error(exc)


@router.put(
    "",
    response_model=ChatSessionListResponse,
    dependencies=[Depends(require_storage)],
)
def sync_chats(
    body: ChatSyncRequest,
    user_id: str = Depends(get_current_user_id),
) -> ChatSessionListResponse:
    try:
        payload = [s.model_dump() for s in body.sessions]
        rows = chats_store.sync_sessions_for_user(user_id, payload)
        return ChatSessionListResponse(
            sessions=[ChatSessionPayload.model_validate(row) for row in rows]
        )
    except Exception as exc:
        _handle_storage_error(exc)


@router.put(
    "/{session_id}",
    response_model=ChatSessionPayload,
    dependencies=[Depends(require_storage)],
)
def upsert_chat(
    session_id: str,
    body: ChatSessionPayload,
    user_id: str = Depends(get_current_user_id),
) -> ChatSessionPayload:
    if body.id != session_id:
        raise HTTPException(status_code=400, detail="Session id mismatch.")
    try:
        row = chats_store.upsert_session_for_user(user_id, body.model_dump())
        return ChatSessionPayload.model_validate(row)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        _handle_storage_error(exc)


@router.delete("", status_code=204, dependencies=[Depends(require_storage)])
def clear_chats(user_id: str = Depends(get_current_user_id)) -> None:
    try:
        chats_store.delete_all_for_user(user_id)
    except Exception as exc:
        _handle_storage_error(exc)
