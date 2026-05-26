import json
import re
from collections.abc import Iterator
from concurrent.futures import ThreadPoolExecutor
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
from app.services.decision_errors import DecisionInfraError

URGENCY_VALUES: set[str] = {
    "self_care",
    "see_doctor_soon",
    "urgent_care",
    "emergency",
}

_EVIDENCE_POOL = ThreadPoolExecutor(max_workers=2, thread_name_prefix="evidence")


def shutdown_evidence_pool() -> None:
    _EVIDENCE_POOL.shutdown(wait=False)


def _infra_message(exc: Exception) -> str:
    if openai_service.is_quota_error(exc):
        return (
            "OpenAI quota or rate limit exceeded. Check usage at "
            "https://platform.openai.com/usage and retry shortly."
        )
    msg = str(exc)
    if "API key" in msg or "OPENAI_API_KEY" in msg:
        return "OpenAI API key is invalid or missing on the server."
    if "timed out" in msg.lower():
        return msg
    if "Could not reach OpenAI" in msg:
        return msg
    return "AI guidance is temporarily unavailable. Please try again shortly."


def _raise_if_infra(exc: Exception) -> None:
    if isinstance(exc, ValueError) and "Could not parse model JSON" in str(exc):
        return
    if openai_service.is_quota_error(exc) or isinstance(exc, RuntimeError):
        raise DecisionInfraError(_infra_message(exc)) from exc

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


def _trim_messages(messages: list[ChatMessage]) -> list[ChatMessage]:
    cap = max(2, get_settings().OPENAI_MAX_CONTEXT_MESSAGES)
    if len(messages) <= cap:
        return messages
    return messages[-cap:]


def _build_user_content(profile: HealthProfile, messages: list[ChatMessage]) -> str:
    trimmed = _trim_messages(messages)
    history = "\n".join(
        f"{'User' if m.role == 'user' else 'Assistant'}: {m.text}" for m in trimmed
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
- Gender: {profile.gender or "not specified"}
- Chronic conditions: {conditions}
- Allergies: {allergies}
- Medications: {profile.medications or "none listed"}
- Pregnant: {preg}

Conversation:
{history}

Provide a health decision JSON for the user's latest concern. Explicitly reflect age, gender, pregnancy status, listed conditions, allergies, and medications where relevant in summary, careSteps, education, and redFlags (e.g. OTC avoidance with allergies, pregnancy precautions, age-appropriate guidance)."""


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


def _attach_evidence(
    decision: HealthDecisionResponse,
    esc: emergency_escalation.EscalationResult,
    evidence_future,
) -> HealthDecisionResponse:
    merged = _merge_escalation(decision, esc)
    settings = get_settings()
    if not settings.EVIDENCE_ENABLED:
        return merged
    try:
        snippets = evidence_future.result(timeout=3.0)
    except Exception:
        snippets = evidence_retrieval.gather_evidence(
            "", limit=max(1, settings.EVIDENCE_MAX_SNIPPETS)
        )
    return merged.model_copy(update={"evidenceSnippets": snippets})


def _extract_partial_from_buffer(buffer: str) -> dict[str, str]:
    out: dict[str, str] = {}
    urgency_match = re.search(r'"urgency"\s*:\s*"([^"]+)"', buffer)
    if urgency_match and urgency_match.group(1) in URGENCY_VALUES:
        out["urgency"] = urgency_match.group(1)
    summary_match = re.search(
        r'"summary"\s*:\s*"((?:[^"\\]|\\.)*)"(?:\s*[,}])',
        buffer,
    )
    if summary_match:
        try:
            out["summary"] = json.loads(f'"{summary_match.group(1)}"')
        except json.JSONDecodeError:
            out["summary"] = summary_match.group(1).replace("\\n", "\n")
    else:
        open_match = re.search(r'"summary"\s*:\s*"((?:[^"\\]|\\.)*)', buffer)
        if open_match and len(open_match.group(1)) >= 12:
            out["summary"] = open_match.group(1).replace("\\n", "\n")
    return out


def decide_stream(
    profile: HealthProfile, messages: list[ChatMessage]
) -> Iterator[dict[str, Any]]:
    """Yield SSE-friendly events: stage, partial, complete."""
    user_blob = " ".join(m.text for m in messages if m.role == "user")
    esc = emergency_escalation.detect_escalation(user_blob)
    user_content = _build_user_content(profile, messages)

    yield {"type": "stage", "stage": "analyzing"}

    settings = get_settings()
    attempts = 1 + max(0, settings.OPENAI_DECISION_RETRIES)
    last_error: Exception | None = None

    evidence_future = _EVIDENCE_POOL.submit(
        evidence_retrieval.gather_evidence,
        user_blob,
        max(1, settings.EVIDENCE_MAX_SNIPPETS),
    )

    last_partial_key = ""

    for _attempt in range(attempts):
        try:
            buffer = ""
            for delta in openai_service.stream_json(SYSTEM_PROMPT, user_content):
                buffer += delta
                partial = _extract_partial_from_buffer(buffer)
                key = json.dumps(partial, sort_keys=True)
                if partial and key != last_partial_key:
                    last_partial_key = key
                    yield {"type": "partial", **partial}
            decision = _parse_decision(buffer)
            if decision:
                final = _attach_evidence(decision, esc, evidence_future)
                yield {"type": "complete", "decision": final.model_dump()}
                return
            last_error = ValueError("Could not parse model JSON")
        except Exception as exc:
            last_error = exc
            if openai_service.is_quota_error(exc):
                _raise_if_infra(exc)
            if isinstance(exc, RuntimeError):
                _raise_if_infra(exc)
            continue

    if last_error:
        _raise_if_infra(last_error)

    fallback = _attach_evidence(FALLBACK_DECISION.model_copy(), esc, evidence_future)
    yield {"type": "complete", "decision": fallback.model_dump()}


def decide(profile: HealthProfile, messages: list[ChatMessage]) -> HealthDecisionResponse:
    user_blob = " ".join(m.text for m in messages if m.role == "user")
    esc = emergency_escalation.detect_escalation(user_blob)
    user_content = _build_user_content(profile, messages)

    settings = get_settings()
    attempts = 1 + max(0, settings.OPENAI_DECISION_RETRIES)
    last_error: Exception | None = None

    evidence_future = _EVIDENCE_POOL.submit(
        evidence_retrieval.gather_evidence,
        user_blob,
        max(1, settings.EVIDENCE_MAX_SNIPPETS),
    )

    for _attempt in range(attempts):
        try:
            raw = openai_service.generate_json(SYSTEM_PROMPT, user_content)
            decision = _parse_decision(raw)
            if decision:
                return _attach_evidence(decision, esc, evidence_future)
            last_error = ValueError("Could not parse model JSON")
        except Exception as exc:
            last_error = exc
            if openai_service.is_quota_error(exc):
                _raise_if_infra(exc)
            if isinstance(exc, RuntimeError):
                _raise_if_infra(exc)
            continue

    if last_error:
        _raise_if_infra(last_error)

    fallback = FALLBACK_DECISION.model_copy()
    return _attach_evidence(fallback, esc, evidence_future)
