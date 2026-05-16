from typing import Literal

from pydantic import BaseModel, Field

UrgencyLevel = Literal[
    "self_care", "see_doctor_soon", "urgent_care", "emergency"
]


class HealthProfile(BaseModel):
    ageRange: str = Field(min_length=1)
    sex: str | None = None
    conditions: list[str] = Field(default_factory=list)
    allergies: list[str] = Field(default_factory=list)
    medications: str = ""
    pregnant: bool | None = None


class ChatMessage(BaseModel):
    role: Literal["user", "model"]
    text: str = Field(min_length=1)


class DecisionRequest(BaseModel):
    profile: HealthProfile
    messages: list[ChatMessage] = Field(min_length=1)


class HealthDecisionResponse(BaseModel):
    urgency: UrgencyLevel
    summary: str
    careSteps: list[str]
    education: list[str]
    redFlags: list[str]
    disclaimer: str
    fallback: bool | None = None
