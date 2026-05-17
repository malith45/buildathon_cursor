"""Rule-based safety escalation on user text — does not replace clinician judgment.

Catches common emergency / urgent phrases the model might under-weight.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

UrgencyLevel = Literal["self_care", "see_doctor_soon", "urgent_care", "emergency"]


@dataclass(frozen=True)
class EscalationResult:
    min_urgency: UrgencyLevel | None
    note: str | None
    matched_terms: tuple[str, ...]


def _normalize(text: str) -> str:
    return " ".join(text.lower().split())


# High-acuity phrases → emergency
_EMERGENCY_SUBSTRINGS: tuple[str, ...] = (
    "chest pain",
    "crushing chest",
    "heart attack",
    "cannot breathe",
    "can't breathe",
    "cant breathe",
    "difficulty breathing",
    "trouble breathing",
    "gasping for air",
    "not breathing",
    "stopped breathing",
    "turning blue",
    "blue lips",
    "facial droop",
    "face drooping",
    "slurred speech",
    "sudden weakness one side",
    "worst headache of my life",
    "thunderclap headache",
    "suicid",
    "kill myself",
    "want to die",
    "end my life",
    "self-harm",
    "self harm",
    "severe bleeding",
    "blood won't stop",
    "unconscious",
    "passed out and won't wake",
    "no pulse",
    "having a stroke",
    "stroke symptoms",
    "anaphylaxis",
    "throat closing",
    "cannot swallow",
    "swollen tongue",
    "seizure lasting",
    "overdose",
    "poisoned",
    "vomiting blood",
    "coughing blood",
    "black stool",
    "melena",
)

# Concerning but not always EMS — still escalate above self-care
_URGENT_SUBSTRINGS: tuple[str, ...] = (
    "high fever",
    "fever 39",
    "fever 40",
    "fever 104",
    "stiff neck",
    "sudden confusion",
    "severe abdominal pain",
    "can't keep fluids down",
    "cannot keep fluids down",
    "signs of dehydration",
    "severe dizziness",
    "fainting repeatedly",
)

_EMERGENCY_NOTE = (
    "A safety filter noticed wording that can match a possible emergency. "
    "If you might be in danger, call your local emergency number or go to the nearest emergency department now. "
    "This tool cannot assess you in real time."
)

_URGENT_NOTE = (
    "A safety filter flagged symptoms that often need same-day in-person care. "
    "If you feel worse or unsure, contact urgent care or a clinician today."
)


def detect_escalation(user_text: str) -> EscalationResult:
    """Scan concatenated user messages for rule-based escalation."""
    t = _normalize(user_text)
    if not t:
        return EscalationResult(None, None, ())

    matched: list[str] = []
    for phrase in _EMERGENCY_SUBSTRINGS:
        if phrase in t:
            matched.append(phrase)
    if matched:
        return EscalationResult(
            "emergency",
            _EMERGENCY_NOTE,
            tuple(dict.fromkeys(matched)),
        )

    matched_u: list[str] = []
    for phrase in _URGENT_SUBSTRINGS:
        if phrase in t:
            matched_u.append(phrase)
    if matched_u:
        return EscalationResult(
            "urgent_care",
            _URGENT_NOTE,
            tuple(dict.fromkeys(matched_u)),
        )

    return EscalationResult(None, None, ())


URGENCY_ORDER: tuple[UrgencyLevel, ...] = (
    "self_care",
    "see_doctor_soon",
    "urgent_care",
    "emergency",
)


def max_urgency(a: UrgencyLevel, b: UrgencyLevel) -> UrgencyLevel:
    ia = URGENCY_ORDER.index(a)
    ib = URGENCY_ORDER.index(b)
    return URGENCY_ORDER[max(ia, ib)]
