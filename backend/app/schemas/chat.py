from pydantic import BaseModel, Field

from app.schemas.health import ChatMessage, HealthDecisionResponse


class ChatSessionPayload(BaseModel):
    id: str
    title: str = Field(min_length=1, max_length=200)
    messages: list[ChatMessage] = Field(default_factory=list)
    lastDecision: HealthDecisionResponse | None = None
    updatedAt: str = Field(min_length=1)


class ChatSessionListResponse(BaseModel):
    sessions: list[ChatSessionPayload]


class ChatSyncRequest(BaseModel):
    sessions: list[ChatSessionPayload] = Field(default_factory=list)
