"""Simple in-memory rate limiting for expensive public endpoints."""

import time
from collections import defaultdict

from fastapi import Request
from fastapi.responses import JSONResponse

from app.config import get_settings

_hits: dict[str, list[float]] = defaultdict(list)


def decision_rate_limit_exceeded(request: Request) -> JSONResponse | None:
    settings = get_settings()
    limit = max(1, settings.DECISION_RATE_LIMIT_PER_MINUTE)
    client = request.client.host if request.client else "unknown"
    now = time.time()
    window_start = now - 60.0
    recent = [t for t in _hits[client] if t > window_start]
    if len(recent) >= limit:
        return JSONResponse(
            status_code=429,
            content={
                "error": (
                    "Too many guidance requests. Please wait a minute and try again."
                )
            },
        )
    recent.append(now)
    _hits[client] = recent
    return None
