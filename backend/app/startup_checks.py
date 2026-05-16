"""Console status when the API starts (database + Gemini)."""

import sys
from urllib.parse import urlparse

from app.config import get_settings
from app.db.connection import database_connection_hint, ping_database
from app.services.gemini_service import probe_gemini


def _db_endpoint_label() -> str:
    settings = get_settings()
    if settings.DATABASE_URL.strip():
        parsed = urlparse(settings.DATABASE_URL)
        host = parsed.hostname or "?"
        port = parsed.port or 5432
        return f"{host}:{port}"
    return f"{settings.DATABASE_HOST}:{settings.DATABASE_PORT}"


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
    Print database and Gemini status with emojis.
    Returns (database_ok, gemini_ok).
    """
    settings = get_settings()
    db_ok = False
    gemini_ok = False

    bar = "=" * 52
    _out("\n" + bar)
    _out("🚀  AI Health & Care Decision API")
    _out(f"🌐  http://127.0.0.1:{settings.PORT}/api/health")
    _out(bar)

    if not settings.DATABASE_ENABLED:
        _out("🗄️  Database: ⏭️   Disabled (DATABASE_ENABLED=false)")
        db_ok = True
    elif not settings.database_configured:
        _out(
            "🗄️  Database: ⏭️   Not configured — set DATABASE_URL in backend/.env"
        )
    else:
        endpoint = _db_endpoint_label()
        timeout = min(settings.DATABASE_CONNECT_TIMEOUT, 15)
        try:
            ping_database(timeout=timeout)
            _out(f"🗄️  Database: ✅  Connected ({endpoint})")
            db_ok = True
        except Exception as exc:
            hint = database_connection_hint()
            _out(f"🗄️  Database: ❌  Unreachable ({endpoint})")
            _out(f"     -> {_short_error(exc)}")
            if len(hint) > 120:
                hint = hint[:117] + "..."
            _out(f"     -> {hint}")

    key = settings.GEMINI_API_KEY.strip()
    if not key:
        _out(
            "🤖  Gemini:   ❌  Not configured — set GEMINI_API_KEY in backend/.env"
        )
    elif not settings.GEMINI_PROBE_ON_STARTUP:
        _out("🤖  Gemini:   🔑  API key set (live probe skipped)")
        gemini_ok = True
    else:
        result = probe_gemini()
        gemini_ok = bool(result.get("working"))
        if gemini_ok:
            model = result.get("model") or "Gemini"
            _out(f"🤖  Gemini:   ✅  Connected ({model})")
        else:
            msg = str(result.get("message") or "Connection failed")
            _out("🤖  Gemini:   ❌  Not connected")
            _out(f"     -> {msg[:160]}")

    _out(bar + "\n")
    return db_ok, gemini_ok
