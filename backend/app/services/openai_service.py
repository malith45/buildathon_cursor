"""OpenAI chat-completion wrapper used by health_decision_service."""

import logging
from functools import lru_cache

from openai import (
    APIConnectionError,
    APIError,
    APITimeoutError,
    AuthenticationError,
    BadRequestError,
    OpenAI,
    RateLimitError,
)

from app.config import get_settings

logger = logging.getLogger(__name__)


class OpenAIQuotaError(RuntimeError):
    """Raised when OpenAI returns a 429 / insufficient_quota."""


def is_quota_error(exc: BaseException) -> bool:
    if isinstance(exc, (OpenAIQuotaError, RateLimitError)):
        return True
    msg = str(exc).lower()
    return any(
        token in msg
        for token in ("429", "rate limit", "insufficient_quota", "quota")
    )


@lru_cache
def _client() -> OpenAI:
    settings = get_settings()
    return OpenAI(
        api_key=settings.OPENAI_API_KEY,
        timeout=settings.OPENAI_TIMEOUT,
        max_retries=0,  # we control retries in health_decision_service
    )


def reset_client_cache() -> None:
    """Used by tests + after-settings changes."""
    _client.cache_clear()


def generate_json(system_instruction: str, user_content: str) -> str:
    """Ask OpenAI to produce a JSON object and return its raw string content.

    Behaviour:
    - JSON mode (`response_format={"type": "json_object"}`) so the model is
      forced to emit valid JSON.
    - 429 / insufficient_quota errors raise OpenAIQuotaError so the caller can
      fail fast without burning more budget.
    """
    settings = get_settings()
    client = _client()

    try:
        response = client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system_instruction},
                {"role": "user", "content": user_content},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
        )
    except RateLimitError as exc:
        raise OpenAIQuotaError(
            f"OpenAI quota exceeded for {settings.OPENAI_MODEL} (429). "
            "Check your usage and credit balance at https://platform.openai.com/usage."
        ) from exc
    except AuthenticationError as exc:
        raise RuntimeError(
            "OpenAI rejected the API key. Verify OPENAI_API_KEY in backend/.env."
        ) from exc

    if not response.choices:
        raise ValueError("Empty response from OpenAI (no choices)")
    text = (response.choices[0].message.content or "").strip()
    if not text:
        raise ValueError("Empty response from OpenAI")
    return text


def probe_openai() -> dict:
    """Lightweight live check — one tiny request to verify the key + model work."""
    settings = get_settings()
    key = settings.OPENAI_API_KEY.strip()
    if not key:
        return {
            "configured": False,
            "working": False,
            "message": "Set OPENAI_API_KEY in backend/.env",
            "model": None,
        }

    client = _client()
    model = settings.OPENAI_MODEL or "gpt-4o-mini"

    try:
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "Reply with exactly: OK"},
                {"role": "user", "content": "Reply OK"},
            ],
            max_tokens=8,
            temperature=0,
        )
        text = (response.choices[0].message.content or "").strip()
        if not text:
            raise ValueError("Empty response from OpenAI")
        return {
            "configured": True,
            "working": True,
            "message": f"Connected via {model}",
            "model": model,
            "sample": text[:32],
        }
    except RateLimitError as exc:
        return {
            "configured": True,
            "working": False,
            "message": (
                "OpenAI quota exceeded (429). Check credit balance at "
                "https://platform.openai.com/usage. "
                f"Detail: {str(exc)[:120]}"
            ),
            "model": None,
        }
    except AuthenticationError:
        return {
            "configured": True,
            "working": False,
            "message": "OpenAI rejected the API key. Check OPENAI_API_KEY.",
            "model": None,
        }
    except (APIConnectionError, APITimeoutError) as exc:
        return {
            "configured": True,
            "working": False,
            "message": f"Could not reach OpenAI: {str(exc)[:140]}",
            "model": None,
        }
    except (BadRequestError, APIError, ValueError) as exc:
        return {
            "configured": True,
            "working": False,
            "message": f"OpenAI returned an error: {str(exc)[:160]}",
            "model": None,
        }
