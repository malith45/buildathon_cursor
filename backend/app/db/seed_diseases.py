from psycopg2.extras import execute_values

from app.data.disease_names import DISEASE_CATEGORIES, DISEASE_NAMES
from app.db.connection import get_connection


def seed_diseases_if_needed(min_count: int = 100) -> int:
    """Insert disease catalog when table is empty or under min_count. Returns rows inserted."""
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM public.diseases")
            row = cur.fetchone()
            existing = int(row[0]) if row else 0
            if existing >= min_count:
                return 0

            rows = [
                (name, DISEASE_CATEGORIES.get(name))
                for name in DISEASE_NAMES
            ]
            execute_values(
                cur,
                """
                INSERT INTO public.diseases (name, category)
                VALUES %s
                ON CONFLICT (name) DO NOTHING
                """,
                rows,
            )
            inserted = cur.rowcount
        return inserted
