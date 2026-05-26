"""In-memory rate limiting (single-process; use Redis for multi-replica)."""

import time
from collections import defaultdict

from fastapi import Request
from fastapi.responses import JSONResponse

from app.config import get_settings

_hits: dict[str, list[float]] = defaultdict(list)
_MAX_TRACKED_KEYS = 5000


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "").strip()
    if forwarded:
        return forwarded.split(",")[0].strip()[:64]
    if request.client:
        return request.client.host
    return "unknown"


def _prune_stale(now: float, window_start: float) -> None:
    if len(_hits) <= _MAX_TRACKED_KEYS:
        return
    stale = [k for k, times in _hits.items() if not times or times[-1] <= window_start]
    for k in stale[: len(_hits) - _MAX_TRACKED_KEYS // 2]:
        del _hits[k]


def _rate_limit_exceeded(
    request: Request,
    *,
    limit: int,
    scope: str,
    message: str,
) -> JSONResponse | None:
    client = f"{scope}:{_client_key(request)}"
    now = time.time()
    window_start = now - 60.0
    recent = [t for t in _hits[client] if t > window_start]
    if len(recent) >= limit:
        return JSONResponse(status_code=429, content={"error": message})
    recent.append(now)
    _hits[client] = recent
    _prune_stale(now, window_start)
    return None


def decision_rate_limit_exceeded(request: Request) -> JSONResponse | None:
    settings = get_settings()
    limit = max(1, settings.DECISION_RATE_LIMIT_PER_MINUTE)
    return _rate_limit_exceeded(
        request,
        limit=limit,
        scope="decision",
        message="Too many guidance requests. Please wait a minute and try again.",
    )


def auth_rate_limit_exceeded(request: Request) -> JSONResponse | None:
    return _rate_limit_exceeded(
        request,
        limit=20,
        scope="auth",
        message="Too many sign-in attempts. Please wait a minute and try again.",
    )
