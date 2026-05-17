import json
import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routers import auth, chats, diseases, health
from app.startup_checks import log_startup_connections
from app.storage import client as storage_client
from app.storage.errors import is_storage_unavailable


logger = logging.getLogger(__name__)


def _ensure_utf8_console() -> None:
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if callable(reconfigure):
            try:
                reconfigure(encoding="utf-8", errors="replace")
            except Exception:
                pass


@asynccontextmanager
async def lifespan(_app: FastAPI):
    _ensure_utf8_console()
    get_settings.cache_clear()
    settings = get_settings()
    settings.validate_production_secrets()
    storage_ok, _ai_ok = log_startup_connections()

    if settings.storage_configured and storage_ok:
        try:
            storage_client.init_storage()
            logger.info("Storage layer ready.")
        except Exception as exc:
            hint = (
                str(exc)
                if str(exc) and "Could not reach" in str(exc)
                else storage_client.storage_health_hint()
            )
            logger.warning(
                "Storage init failed (%s). %s "
                "Set STORAGE_ENABLED=false to skip GCS, or fix backend/.env.",
                exc.__class__.__name__,
                hint,
            )
    yield


app = FastAPI(
    title="MediAssist AI API",
    version="1.0.0",
    lifespan=lifespan,
)

settings = get_settings()

_cors_origins = list(
    {
        settings.CORS_ORIGIN.strip(),
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    }
    - {""}
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(diseases.router, prefix="/api")
app.include_router(chats.router, prefix="/api")


@app.exception_handler(HTTPException)
async def http_exception_handler(
    _request: Request, exc: HTTPException
) -> JSONResponse:
    detail = exc.detail
    if isinstance(detail, str):
        return JSONResponse(status_code=exc.status_code, content={"error": detail})
    if isinstance(detail, dict):
        body: dict = {}
        if "error" in detail:
            body["error"] = str(detail["error"])
        elif "message" in detail:
            body["error"] = str(detail["message"])
        else:
            body["error"] = "Request failed"
        if "details" in detail:
            body["details"] = detail["details"]
        return JSONResponse(status_code=exc.status_code, content=body)
    return JSONResponse(
        status_code=exc.status_code, content={"error": "Request failed"}
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    payload = {
        "error": "Invalid request body",
        "details": exc.errors(),
    }
    # Pydantic may embed ValueError objects in ctx — ensure JSON-safe.
    safe_payload = json.loads(json.dumps(payload, default=str))
    return JSONResponse(status_code=400, content=safe_payload)


@app.exception_handler(Exception)
async def generic_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    message = str(exc)
    if "OPENAI_API_KEY" in message:
        return JSONResponse(
            status_code=503,
            content={"error": "Server is not configured with an OpenAI API key."},
        )
    if is_storage_unavailable(exc):
        return JSONResponse(
            status_code=503,
            content={
                "error": (
                    "Storage is unavailable. Check GCS_BUCKET and credentials in backend/.env."
                )
            },
        )
    logger.exception("Unhandled error")
    return JSONResponse(
        status_code=500,
        content={"error": "An unexpected error occurred."},
    )
