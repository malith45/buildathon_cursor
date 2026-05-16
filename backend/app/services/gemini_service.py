from google import genai
from google.genai import types

from app.config import get_settings

# Lite model first — separate free-tier quota from 2.0/2.5 flash
DEFAULT_MODELS = (
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
)


def is_quota_error(exc: Exception) -> bool:
    msg = str(exc).lower()
    return any(
        token in msg
        for token in ("429", "quota", "resource_exhausted", "rate limit", "exceeded")
    )


def _models_to_try(*, allow_fallbacks: bool | None = None) -> tuple[str, ...]:
    settings = get_settings()
    primary = settings.GEMINI_MODEL.strip()
    if primary:
        ordered: tuple[str, ...] = (primary,) + tuple(
            m for m in DEFAULT_MODELS if m != primary
        )
    else:
        ordered = DEFAULT_MODELS

    use_all = (
        settings.GEMINI_TRY_ALL_MODELS
        if allow_fallbacks is None
        else allow_fallbacks
    )
    if use_all:
        return ordered
    return (ordered[0],)


def _client() -> genai.Client:
    settings = get_settings()
    return genai.Client(api_key=settings.GEMINI_API_KEY)


def _response_text(response: types.GenerateContentResponse) -> str:
    text = (response.text or "").strip()
    if text:
        return text
    candidates = response.candidates or []
    if not candidates:
        return ""
    content = candidates[0].content
    if not content or not content.parts:
        return ""
    chunks: list[str] = []
    for part in content.parts:
        if part.text:
            chunks.append(part.text)
    return "".join(chunks).strip()


def generate_json(system_instruction: str, user_content: str) -> str:
    client = _client()
    last_error: Exception | None = None

    models = _models_to_try()
    quota_hits = 0
    for model_name in models:
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=user_content,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                ),
            )
            text = _response_text(response)
            if not text:
                raise ValueError("Empty response from Gemini")
            return text
        except Exception as exc:
            last_error = exc
            if is_quota_error(exc):
                quota_hits += 1
            continue

    if last_error and quota_hits == len(models):
        raise RuntimeError(
            "Gemini API quota exceeded (429). Free tier limits reset over time — "
            "wait and retry, create a new key at https://aistudio.google.com/apikey, "
            "or enable billing in Google AI Studio."
        ) from last_error
    if last_error:
        raise last_error
    raise ValueError("No Gemini model available")


def probe_gemini() -> dict:
    """Lightweight live check — one model only unless GEMINI_TRY_ALL_MODELS=true."""
    settings = get_settings()
    key = settings.GEMINI_API_KEY.strip()
    if not key:
        return {
            "configured": False,
            "working": False,
            "message": "Set GEMINI_API_KEY in backend .env",
            "model": None,
        }

    client = _client()
    last_error: Exception | None = None

    quota_hits = 0
    for model_name in _models_to_try(allow_fallbacks=False):
        try:
            response = client.models.generate_content(
                model=model_name,
                contents="Reply with exactly: OK",
                config=types.GenerateContentConfig(max_output_tokens=16),
            )
            text = _response_text(response)
            if not text:
                raise ValueError("Empty response from Gemini")
            return {
                "configured": True,
                "working": True,
                "message": f"Connected via {model_name}",
                "model": model_name,
                "sample": text[:32],
            }
        except Exception as exc:
            last_error = exc
            if is_quota_error(exc):
                quota_hits += 1
            continue

    if quota_hits > 0:
        msg = (
            "Gemini free-tier quota exceeded (429). Limits reset daily — "
            "wait and retry, or check usage at https://aistudio.google.com"
        )
    else:
        msg = str(last_error)[:160] if last_error else "All models failed"
    return {
        "configured": True,
        "working": False,
        "message": msg,
        "model": None,
    }
