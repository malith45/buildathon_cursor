import json
from typing import Any

from app.prompts.system_prompt import SYSTEM_PROMPT
from app.schemas.health import (
    ChatMessage,
    HealthDecisionResponse,
    HealthProfile,
)
from app.config import get_settings
from app.services import openai_service
from app.services import emergency_escalation
from app.services import evidence_retrieval

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
    preg = (
        "yes"
        if profile.pregnant is True
        else ("no" if profile.pregnant is False else "not specified / unknown")
    )
    return f"""Health profile (you MUST tailor every part of your JSON to this context):
- Age range: {profile.ageRange}
- Sex: {profile.sex or "not specified"}
- Chronic conditions: {conditions}
- Allergies: {allergies}
- Medications: {profile.medications or "none listed"}
- Pregnant: {preg}

Conversation:
{history}

Provide a health decision JSON for the user's latest concern. Explicitly reflect age, sex, pregnancy status, listed conditions, allergies, and medications where relevant in summary, careSteps, education, and redFlags (e.g. OTC avoidance with allergies, pregnancy precautions, age-appropriate guidance)."""


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


def _merge_escalation(
    decision: HealthDecisionResponse,
    esc: emergency_escalation.EscalationResult,
) -> HealthDecisionResponse:
    if not esc.min_urgency:
        return decision

    new_u = emergency_escalation.max_urgency(decision.urgency, esc.min_urgency)
    red = list(decision.redFlags)
    if esc.min_urgency == "emergency":
        line = (
            "If you could be having a medical emergency, call your local "
            "emergency number or go to the nearest emergency department now."
        )
        if not any(line[:30] in r for r in red):
            red.insert(0, line)
    elif esc.min_urgency == "urgent_care":
        line = (
            "Same-day in-person care may be appropriate. If symptoms worsen, "
            "seek urgent care or an emergency department."
        )
        if not any("Same-day" in r for r in red):
            red.insert(0, line)

    return decision.model_copy(
        update={
            "urgency": new_u,
            "redFlags": red,
            "safetyEscalation": True,
            "safetyNote": esc.note,
        }
    )


def _finalize_decision(
    decision: HealthDecisionResponse,
    esc: emergency_escalation.EscalationResult,
    user_blob: str,
) -> HealthDecisionResponse:
    merged = _merge_escalation(decision, esc)
    snippets = evidence_retrieval.gather_evidence(user_blob)
    return merged.model_copy(update={"evidenceSnippets": snippets})


def decide(profile: HealthProfile, messages: list[ChatMessage]) -> HealthDecisionResponse:
    user_blob = " ".join(m.text for m in messages if m.role == "user")
    esc = emergency_escalation.detect_escalation(user_blob)
    user_content = _build_user_content(profile, messages)

    settings = get_settings()
    retries = max(1, settings.OPENAI_DECISION_RETRIES)
    last_error: Exception | None = None

    for _attempt in range(retries):
        try:
            raw = openai_service.generate_json(SYSTEM_PROMPT, user_content)
            decision = _parse_decision(raw)
            if decision:
                return _finalize_decision(decision, esc, user_blob)
            last_error = ValueError("Could not parse model JSON")
        except Exception as exc:
            last_error = exc
            # Stop immediately on quota errors — retrying just burns more budget.
            if openai_service.is_quota_error(exc):
                break
            continue

    fallback = FALLBACK_DECISION.model_copy()
    if last_error and openai_service.is_quota_error(last_error):
        fallback.summary = (
            "OpenAI's API quota or rate limit was exceeded. This is a generic "
            "safety response. Check your usage at "
            "https://platform.openai.com/usage and retry shortly."
        )
    return _finalize_decision(fallback, esc, user_blob)
