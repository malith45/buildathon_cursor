import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.data.disease_names import DISEASE_CATEGORIES, DISEASE_NAMES

out = Path(__file__).resolve().parents[1] / "supabase" / "schema.sql"
out.parent.mkdir(parents=True, exist_ok=True)

lines = [
    "-- Run in Supabase: SQL Editor -> New query -> Run",
    "-- Creates diseases table and seeds 120+ conditions",
    "",
    "CREATE TABLE IF NOT EXISTS public.diseases (",
    "    id SERIAL PRIMARY KEY,",
    "    name TEXT NOT NULL UNIQUE,",
    "    category TEXT,",
    "    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()",
    ");",
    "",
    "CREATE INDEX IF NOT EXISTS diseases_name_lower_idx ON public.diseases (LOWER(name));",
    "",
    "INSERT INTO public.diseases (name, category) VALUES",
]

values: list[str] = []
for name in DISEASE_NAMES:
    escaped = name.replace("'", "''")
    cat = DISEASE_CATEGORIES.get(name)
    cat_sql = f"'{cat.replace(chr(39), chr(39) * 2)}'" if cat else "NULL"
    values.append(f"    ('{escaped}', {cat_sql})")

lines.append(",\n".join(values))
lines.append("ON CONFLICT (name) DO NOTHING;")
lines.extend(
    [
        "",
        "-- Backend uses direct Postgres (pooler); disable RLS for server-side access",
        "ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;",
        "ALTER TABLE public.chat_sessions DISABLE ROW LEVEL SECURITY;",
        "ALTER TABLE public.diseases DISABLE ROW LEVEL SECURITY;",
    ]
)

out.write_text("\n".join(lines), encoding="utf-8")
print(f"Wrote {out} ({len(DISEASE_NAMES)} diseases)")
