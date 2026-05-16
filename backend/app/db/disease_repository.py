from app.db.connection import dict_cursor, get_connection


def search_diseases(query: str = "", limit: int = 20) -> list[dict]:
    limit = max(1, min(limit, 50))
    q = query.strip()

    with get_connection() as conn:
        with dict_cursor(conn) as cur:
            if q:
                cur.execute(
                    """
                    SELECT id, name, category
                    FROM public.diseases
                    WHERE name ILIKE %s
                    ORDER BY
                        CASE WHEN LOWER(name) LIKE LOWER(%s) THEN 0 ELSE 1 END,
                        name
                    LIMIT %s
                    """,
                    (f"%{q}%", f"{q}%", limit),
                )
            else:
                cur.execute(
                    """
                    SELECT id, name, category
                    FROM public.diseases
                    ORDER BY name
                    LIMIT %s
                    """,
                    (limit,),
                )
            return [dict(row) for row in cur.fetchall()]
