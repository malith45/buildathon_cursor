"""Lightweight retrieval: in-memory catalog + MedlinePlus link (no network I/O)."""

from __future__ import annotations

from urllib.parse import quote_plus

from app.schemas.health import EvidenceSnippet
from app.storage import diseases_store


def medlineplus_search_url(query: str) -> str:
    q = quote_plus(query.strip()[:80] or "symptoms")
    return (
        "https://vsearch.nlm.nih.gov/vivisimo/cgi-bin/query-meta"
        f"?v:project=medlineplus&v:sources=medlineplus-bundle&query={q}"
    )


def gather_evidence(user_messages_blob: str, limit: int = 2) -> list[EvidenceSnippet]:
    """Fast path: one catalog scan + one NIH link (runs in parallel with OpenAI)."""
    limit = max(1, min(limit, 4))
    blob = user_messages_blob.strip()
    primary_q = blob[:80] if blob else "symptoms"
    snippets: list[EvidenceSnippet] = []

    try:
        rows = diseases_store.search_diseases(primary_q, limit=max(1, limit - 1))
    except Exception:
        rows = []

    for row in rows:
        name = str(row.get("name") or "").strip()
        if not name:
            continue
        cat = row.get("category")
        cat_s = f" ({cat})" if cat else ""
        snippets.append(
            EvidenceSnippet(
                title=name,
                source="MediAssist educational condition index",
                snippet=(
                    f"Matched your message to this catalog label{cat_s}. "
                    "For general reading only — not a diagnosis."
                ),
                url=medlineplus_search_url(name),
            )
        )

    snippets.append(
        EvidenceSnippet(
            title="MedlinePlus — topic search",
            source="U.S. National Library of Medicine (NIH)",
            snippet="Clinician-reviewed health topics from NIH.",
            url=medlineplus_search_url(primary_q),
        )
    )
    return snippets[:limit]
