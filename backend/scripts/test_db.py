"""Test Supabase connectivity. Run: cd backend && python scripts/test_db.py"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings

get_settings.cache_clear()
from app.db.connection import database_connection_hint, init_schema, ping_database


def main() -> None:
    settings = get_settings()
    print("DATABASE_ENABLED:", settings.DATABASE_ENABLED)
    print("database_configured:", settings.database_configured)
    if settings.DATABASE_URL.strip():
        print("Using DATABASE_URL: yes")
    else:
        print("DATABASE_HOST:", settings.DATABASE_HOST)
        print("DATABASE_PORT:", settings.DATABASE_PORT)
        print("DATABASE_USER:", settings.DATABASE_USER)

    if not settings.database_configured:
        print("\nERROR: Set DATABASE_URL or DATABASE_HOST/USER/PASSWORD in backend/.env")
        raise SystemExit(1)

    print("\nPinging database...")
    try:
        ping_database()
        print("Ping OK")
    except Exception as exc:
        print("Ping FAILED:", exc)
        print("\n", database_connection_hint())
        raise SystemExit(1) from exc

    print("Applying schema + disease seed...")
    init_schema()
    print("Done — tables and diseases should be ready.")


if __name__ == "__main__":
    main()
