"""Apply schema + seed diseases. Run from backend/: python scripts/init_db.py"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings
from app.db.connection import init_schema


def main() -> None:
    settings = get_settings()
    if not settings.database_configured:
        print("ERROR: Set DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD in .env")
        raise SystemExit(1)
    print("Connecting and applying schema + disease seed...")
    init_schema()
    print("Done. Refresh Supabase Table Editor to see public.diseases.")


if __name__ == "__main__":
    main()
