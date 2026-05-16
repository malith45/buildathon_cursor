import json
from typing import Any

from app.prompts.system_prompt import SYSTEM_PROMPT
from app.schemas.health import (
    ChatMessage,
    HealthDecisionResponse,
    HealthProfile,
    UrgencyLevel,
)
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

    for _ in range(2):
        try:
            raw = gemini_service.generate_json(SYSTEM_PROMPT, user_content)
            decision = _parse_decision(raw)
            if decision:
                return decision
        except Exception:
            continue

    return FALLBACK_DECISION.model_copy()
