import json
from typing import Any

from app.prompts.system_prompt import SYSTEM_PROMPT
from app.schemas.health import (
    ChatMessage,
    HealthDecisionResponse,
    HealthProfile,
    UrgencyLevel,
)
from app.config import get_settings
from app.services import gemini_service

URGENCY_VALUES: set[str] = {
    "self_care",
    "see_doctor_soon",
    "urgent_care",
    "emergency",
}

FALLBACK_DECISION = HealthDecisionResponse(
    urgency="see_doctor_soon",
    summary=(
        "We could not process your request reliably. Please consult a "
        "healthcare professional for personalized advice."
    ),
    careSteps=[
        "Monitor your symptoms and note any changes.",
        "Contact a doctor or nurse line if symptoms worsen.",
    ],
    education=[
        "Online tools cannot replace an in-person medical evaluation.",
    ],
    redFlags=[
        "Seek emergency care immediately for chest pain, trouble breathing, "
        "severe bleeding, or sudden confusion.",
    ],
    disclaimer=(
        "This information is for educational purposes only and is not a "
        "substitute for professional medical advice."
    ),
    fallback=True,
)


def _build_user_content(profile: HealthProfile, messages: list[ChatMessage]) -> str:
    history = "\n".join(
        f"{'User' if m.role == 'user' else 'Assistant'}: {m.text}" for m in messages
    )
    conditions = ", ".join(profile.conditions) if profile.conditions else "none listed"
    allergies = ", ".join(profile.allergies) if profile.allergies else "none listed"
    return f"""Health profile:
- Age range: {profile.ageRange}
- Sex: {profile.sex or "not specified"}
- Chronic conditions: {conditions}
- Allergies: {allergies}
- Medications: {profile.medications or "none listed"}
- Pregnant: {"yes" if profile.pregnant else "no"}

Conversation:
{history}

Provide a health decision JSON for the user's latest concern based on the full conversation."""


def _parse_decision(raw: str) -> HealthDecisionResponse | None:
    try:
        parsed: dict[str, Any] = json.loads(raw)
        urgency = parsed.get("urgency")
        if urgency not in URGENCY_VALUES:
            return None
        return HealthDecisionResponse(
            urgency=urgency,  # type: ignore[arg-type]
            summary=str(parsed.get("summary", "")),
            careSteps=[str(x) for x in parsed.get("careSteps", [])]
            if isinstance(parsed.get("careSteps"), list)
            else [],
            education=[str(x) for x in parsed.get("education", [])]
            if isinstance(parsed.get("education"), list)
            else [],
            redFlags=[str(x) for x in parsed.get("redFlags", [])]
            if isinstance(parsed.get("redFlags"), list)
            else [],
            disclaimer=str(
                parsed.get("disclaimer")
                or "This information is for educational purposes only and is not a substitute for professional medical advice."
            ),
        )
    except (json.JSONDecodeError, TypeError, ValueError):
        return None


def decide(profile: HealthProfile, messages: list[ChatMessage]) -> HealthDecisionResponse:
    user_content = _build_user_content(profile, messages)

    settings = get_settings()
    retries = max(1, settings.GEMINI_DECISION_RETRIES)
    last_error: Exception | None = None
    for _ in range(retries):
        try:
            raw = gemini_service.generate_json(SYSTEM_PROMPT, user_content)
            decision = _parse_decision(raw)
            if decision:
                return decision
        except Exception as exc:
            last_error = exc
            continue

    fallback = FALLBACK_DECISION.model_copy()
    if last_error and gemini_service.is_quota_error(last_error):
        fallback.summary = (
            "Gemini API quota is exceeded on the free tier (429), so this is "
            "generic guidance only. Wait a few minutes or check billing at "
            "Google AI Studio, then try again."
        )
    return fallback
