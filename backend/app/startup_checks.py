"""Console status when the API starts (GCS storage + OpenAI)."""

import sys

from app.config import get_settings
from app.storage import client as storage_client


def _storage_endpoint_label() -> str:
    settings = get_settings()
    bucket = settings.GCS_BUCKET.strip() or "<unset>"
    project = settings.GCS_PROJECT.strip()
    return f"gs://{bucket}" + (f" (project {project})" if project else "")


def _out(msg: str) -> None:
    """Print to console; replace unsupported glyphs on legacy Windows encodings."""
    try:
        print(msg, flush=True)
    except UnicodeEncodeError:
        enc = getattr(sys.stdout, "encoding", None) or "utf-8"
        print(msg.encode(enc, errors="replace").decode(enc), flush=True)


def _short_error(exc: Exception, *, max_len: int = 140) -> str:
    text = str(exc).strip() or exc.__class__.__name__
    if len(text) > max_len:
        return text[: max_len - 3] + "..."
    return text


def log_startup_connections() -> tuple[bool, bool]:
    """
    Print storage and OpenAI status with emojis.
    Returns (storage_ok, ai_ok).
    """
    settings = get_settings()
    storage_ok = False
    ai_ok = False

    bar = "=" * 52
    _out("\n" + bar)
    _out("🚀  MediAssist AI API")
    _out(f"🌐  http://127.0.0.1:{settings.PORT}/api/health")
    _out(bar)

    # ---------- Storage ----------
    if not settings.STORAGE_ENABLED:
        _out("📦  Storage:  ⏭️   Disabled (STORAGE_ENABLED=false)")
        storage_ok = True
    elif not settings.storage_configured:
        _out("📦  Storage:  ⏭️   Not configured — set GCS_BUCKET in backend/.env")
    elif not storage_client.can_attempt_storage():
        endpoint = _storage_endpoint_label()
        hint = storage_client.storage_health_hint()
        _out(f"📦  Storage:  ❌  Credentials missing ({endpoint})")
        if len(hint) > 140:
            hint = hint[:137] + "..."
        _out(f"     -> {hint}")
    else:
        endpoint = _storage_endpoint_label()
        try:
            storage_client.storage_ping()
            _out(f"📦  Storage:  ✅  Connected ({endpoint})")
            storage_ok = True
        except Exception as exc:
            hint = storage_client.storage_health_hint()
            _out(f"📦  Storage:  ❌  Unreachable ({endpoint})")
            _out(f"     -> {_short_error(exc)}")
            if len(hint) > 140:
                hint = hint[:137] + "..."
            _out(f"     -> {hint}")

    # ---------- OpenAI ----------
    key = settings.OPENAI_API_KEY.strip()
    if not key:
        _out(
            "🤖  OpenAI:   ❌  Not configured — set OPENAI_API_KEY in backend/.env"
        )
    else:
        _out(
            f"🤖  OpenAI:   🔑  API key set, model={settings.OPENAI_MODEL}"
        )
        ai_ok = True

    _out(bar + "\n")
    return storage_ok, ai_ok
