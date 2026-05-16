import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.db.connection import init_schema
from app.db.errors import is_database_unavailable
from app.routers import auth, chats, diseases, health
from app.startup_checks import log_startup_connections


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
    db_ok, _gemini_ok = log_startup_connections()

    if settings.database_configured and db_ok:
        try:
            init_schema()
            logger.info("Database schema ready.")
        except Exception as exc:
            from app.db.connection import database_connection_hint

            hint = (
                str(exc)
                if str(exc) and "Could not reach" in str(exc)
                else database_connection_hint()
            )
            logger.warning(
                "Database schema init failed (%s). %s "
                "Set DATABASE_ENABLED=false to skip DB, or fix backend/.env.",
                exc.__class__.__name__,
                hint,
            )
    yield


app = FastAPI(
    title="AI Health & Care Decision API",
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
        message = detail
    elif isinstance(detail, dict) and "error" in detail:
        message = str(detail["error"])
    else:
        message = "Request failed"
    return JSONResponse(status_code=exc.status_code, content={"error": message})


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    _request: Request, exc: RequestValidationError
) -> JSONResponse:
    return JSONResponse(
        status_code=400,
        content={"error": "Invalid request body", "details": exc.errors()},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    message = str(exc)
    if "GEMINI_API_KEY" in message:
        return JSONResponse(
            status_code=503,
            content={"error": "Server is not configured with a Gemini API key."},
        )
    if is_database_unavailable(exc):
        return JSONResponse(
            status_code=503,
            content={
                "error": (
                    "Database is unavailable. Check DATABASE_* in backend/.env."
                )
            },
        )
    logger.exception("Unhandled error")
    return JSONResponse(
        status_code=500,
        content={"error": "An unexpected error occurred."},
    )
