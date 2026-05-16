"""One-off migration: copy a single user record from Supabase Postgres to GCS.

Usage (from the backend/ directory, with the venv activated):

    # Make sure backend/.env has GCS_BUCKET + GOOGLE_APPLICATION_CREDENTIALS set
    # AND that you can still reach Supabase (paste the old SUPABASE_DATABASE_URL
    # into the env var below or pass it on the command line).

    python -m scripts.migrate_user_from_supabase --email you@example.com \
        --supabase-url "postgresql://postgres.xxx:pwd@aws-...pooler.supabase.com:5432/postgres?sslmode=require"

After it succeeds, log in to the app with the same email + password — the row
now lives at gs://$GCS_BUCKET/users/{user_id}.json with the email index updated.

This script is intentionally standalone (it does NOT import from app.db, which
has been deleted) so it can run after the Supabase migration is complete.
The only Supabase-era dependency it needs is `psycopg2-binary`, which is
already in requirements.txt and can be removed once you no longer need this.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from urllib.parse import unquote, urlparse

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
except ImportError:
    print(
        "ERROR: psycopg2 is required for this migration script.\n"
        "Install with: pip install psycopg2-binary",
        file=sys.stderr,
    )
    sys.exit(1)

# Make app.* importable when invoked as `python -m scripts.migrate_user_from_supabase`.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings  # noqa: E402
from app.schemas.health import HealthProfile  # noqa: E402
from app.storage import users_store  # noqa: E402
from app.storage.errors import StorageConflict  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--email",
        required=True,
        help="Email of the Supabase user to migrate (case-insensitive)",
    )
    parser.add_argument(
        "--supabase-url",
        default=os.environ.get("SUPABASE_DATABASE_URL", ""),
        help=(
            "Old Supabase Postgres connection string. "
            "Default: $SUPABASE_DATABASE_URL env var."
        ),
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="If the user already exists in GCS, replace it.",
    )
    return parser.parse_args()


def connect_supabase(database_url: str):
    if not database_url.strip():
        raise SystemExit(
            "Pass --supabase-url or set SUPABASE_DATABASE_URL. "
            "Example: postgresql://postgres.xxx:pwd@aws-...pooler.supabase.com:5432/postgres?sslmode=require"
        )
    parsed = urlparse(database_url)
    return psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        dbname=(parsed.path or "/postgres").lstrip("/") or "postgres",
        user=unquote(parsed.username) if parsed.username else None,
        password=unquote(parsed.password) if parsed.password else None,
        sslmode="require",
        connect_timeout=20,
    )


def fetch_user(database_url: str, email: str) -> dict | None:
    normalized = email.strip().lower()
    with connect_supabase(database_url) as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT id, email, password_hash, name, health_profile, created_at "
                "FROM public.users WHERE LOWER(email) = %s",
                (normalized,),
            )
            return cur.fetchone()


def main() -> int:
    args = parse_args()

    settings = get_settings()
    if not settings.storage_configured:
        print(
            "GCS_BUCKET is not set in backend/.env — set it before running this script.",
            file=sys.stderr,
        )
        return 2

    print(f"Fetching user '{args.email}' from Supabase...")
    row = fetch_user(args.supabase_url, args.email)
    if not row:
        print(f"No user found in Supabase with email {args.email!r}.", file=sys.stderr)
        return 3

    user_id = str(row["id"])
    profile_raw = row["health_profile"]
    if isinstance(profile_raw, str):
        profile_raw = json.loads(profile_raw)
    profile = HealthProfile.model_validate(profile_raw or {})
    created_at = row["created_at"]
    if hasattr(created_at, "isoformat"):
        created_at_str = created_at.isoformat()
    else:
        created_at_str = str(created_at)

    print(f"  -> id={user_id}  name={row['name']!r}  created_at={created_at_str}")
    print(f"Writing to gs://{settings.GCS_BUCKET}/users/{user_id}.json ...")

    existing = users_store.find_by_id(user_id)
    if existing and not args.overwrite:
        print(
            f"User {user_id} already exists in GCS. Re-run with --overwrite to replace.",
            file=sys.stderr,
        )
        return 4

    if existing and args.overwrite:
        users_store.delete_user(user_id)

    try:
        users_store.insert_user(
            email=row["email"],
            password_hash=row["password_hash"],
            name=row["name"],
            health_profile=profile,
            user_id=user_id,
            created_at=created_at_str,
        )
    except StorageConflict as exc:
        print(f"GCS rejected the write: {exc}", file=sys.stderr)
        return 5

    print("Done.")
    print("Log in with the same email + password to verify.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
