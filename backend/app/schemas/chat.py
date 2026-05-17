import uuid

from pydantic import BaseModel, Field, field_validator

from app.schemas.health import ChatMessage, HealthDecisionResponse


class ChatSessionPayload(BaseModel):
    id: str
    title: str = Field(min_length=1, max_length=200)
    messages: list[ChatMessage] = Field(default_factory=list)
    lastDecision: HealthDecisionResponse | None = None
    updatedAt: str = Field(min_length=1)

    @field_validator("id")
    @classmethod
    def id_must_be_uuid(cls, value: str) -> str:
        uuid.UUID(value)
        return value


class ChatSessionListResponse(BaseModel):
    sessions: list[ChatSessionPayload]


class ChatSyncRequest(BaseModel):
    sessions: list[ChatSessionPayload] = Field(default_factory=list)
