import logging
import socket
from contextlib import contextmanager
from typing import Any, Generator
from urllib.parse import parse_qs, unquote, urlparse

import psycopg2
from psycopg2.extensions import connection as PgConnection
from psycopg2.extras import RealDictCursor

from app.config import get_settings

logger = logging.getLogger(__name__)

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    health_profile JSONB NOT NULL DEFAULT '{"ageRange":"25-34","conditions":[],"allergies":[],"medications":""}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    last_decision JSONB,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx
    ON public.chat_sessions(user_id);

CREATE TABLE IF NOT EXISTS public.diseases (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    category TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS diseases_name_lower_idx
    ON public.diseases (LOWER(name));

ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.diseases DISABLE ROW LEVEL SECURITY;
"""


def _ipv4_hostaddr(hostname: str) -> str | None:
    """Prefer IPv4 — avoids long hangs when IPv6 routes are unreachable."""
    try:
        infos = socket.getaddrinfo(
            hostname, None, family=socket.AF_INET, type=socket.SOCK_STREAM
        )
        if infos:
            return infos[0][4][0]
    except OSError:
        return None
    return None


def _connection_targets() -> list[tuple[str, int, str]]:
    """Host/port pairs to try (session pooler, then transaction pooler)."""
    settings = get_settings()
    host = settings.DATABASE_HOST.strip()
    port = settings.DATABASE_PORT
    targets: list[tuple[str, int, str]] = [(host, port, "configured")]

    if "pooler.supabase.com" in host and port == 5432:
        targets.append((host, 6543, "transaction-pooler"))

    return targets


def _connect_kwargs(host: str, port: int, timeout: int) -> dict[str, Any]:
    settings = get_settings()
    kwargs: dict[str, Any] = {
        "host": host,
        "port": port,
        "dbname": settings.DATABASE_NAME,
        "user": settings.DATABASE_USER,
        "password": settings.DATABASE_PASSWORD,
        "sslmode": "require",
        "connect_timeout": timeout,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    }
    hostaddr = _ipv4_hostaddr(host)
    if hostaddr:
        kwargs["hostaddr"] = hostaddr
    return kwargs


def _connect_from_url(database_url: str, connect_timeout: int) -> PgConnection:
    """Parse DATABASE_URL without psycopg2.conninfo_to_dict (not in all builds)."""
    parsed = urlparse(database_url)
    query = parse_qs(parsed.query)
    sslmode = query.get("sslmode", ["require"])[0]

    kwargs: dict[str, Any] = {
        "host": parsed.hostname,
        "port": parsed.port or 5432,
        "dbname": (parsed.path or "/postgres").lstrip("/") or "postgres",
        "user": unquote(parsed.username) if parsed.username else None,
        "password": unquote(parsed.password) if parsed.password else None,
        "sslmode": sslmode,
        "connect_timeout": connect_timeout,
        "keepalives": 1,
        "keepalives_idle": 30,
        "keepalives_interval": 10,
        "keepalives_count": 5,
    }

    if kwargs["host"]:
        hostaddr = _ipv4_hostaddr(str(kwargs["host"]))
        if hostaddr:
            kwargs["hostaddr"] = hostaddr

    return psycopg2.connect(
        **{k: v for k, v in kwargs.items() if v is not None}
    )


def _connect(timeout: int | None = None) -> PgConnection:
    settings = get_settings()
    connect_timeout = (
        timeout if timeout is not None else settings.DATABASE_CONNECT_TIMEOUT
    )

    database_url = settings.DATABASE_URL.strip()
    if database_url:
        return _connect_from_url(database_url, connect_timeout)

    last_error: Exception | None = None
    for host, port, label in _connection_targets():
        try:
            conn = psycopg2.connect(**_connect_kwargs(host, port, connect_timeout))
            if label != "configured":
                logger.info(
                    "Database connected via %s (%s:%s)", label, host, port
                )
            return conn
        except Exception as exc:
            last_error = exc
            logger.debug(
                "DB connect failed (%s %s:%s): %s",
                label,
                host,
                port,
                exc,
            )
            # Network timeout on session pooler — transaction pooler won't help
            if "timeout" in str(exc).lower():
                break

    if last_error:
        raise last_error
    raise RuntimeError("No database connection target configured")


def database_connection_hint() -> str:
    settings = get_settings()
    if settings.DATABASE_URL.strip():
        parsed = urlparse(settings.DATABASE_URL)
        host = parsed.hostname or "?"
        port = parsed.port or 5432
    else:
        host = settings.DATABASE_HOST or "?"
        port = settings.DATABASE_PORT
    return (
        f"Could not reach Postgres at {host}:{port}. "
        "In Supabase: Project Settings > Database > Connect, copy the Session pooler URI "
        "into DATABASE_URL in backend/.env, or verify DATABASE_HOST/USER/PASSWORD. "
        "Ensure the project is not paused and port 5432 is not blocked by your network."
    )


@contextmanager
def get_connection(timeout: int | None = None) -> Generator[PgConnection, None, None]:
    conn = _connect(timeout=timeout)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def ping_database(timeout: int | None = None) -> None:
    """Raise if the database cannot be reached."""
    with get_connection(timeout=timeout) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1")


def init_schema() -> None:
    """Create missing tables; seed diseases in a separate step (non-fatal)."""
    settings = get_settings()
    if not settings.database_configured:
        return

    schema_timeout = max(settings.DATABASE_CONNECT_TIMEOUT, 25)
    try:
        with get_connection(timeout=schema_timeout) as conn:
            with conn.cursor() as cur:
                cur.execute(SCHEMA_SQL)
    except Exception as exc:
        raise RuntimeError(database_connection_hint()) from exc

    try:
        from app.db.seed_diseases import seed_diseases_if_needed

        seed_diseases_if_needed()
    except Exception:
        logger.warning(
            "Disease seed skipped (table exists but rows may be empty). "
            "Run backend/supabase/schema.sql in Supabase SQL Editor if needed.",
            exc_info=True,
        )


def dict_cursor(conn: PgConnection) -> RealDictCursor:
    return conn.cursor(cursor_factory=RealDictCursor)
