"""Lightweight retrieval: local disease catalog + links to MedlinePlus search (NIH)."""

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


def gather_evidence(user_messages_blob: str, limit: int = 4) -> list[EvidenceSnippet]:
    """Match user wording to catalog names; always include at least one trusted portal."""
    limit = max(1, min(limit, 8))
    blob = user_messages_blob.strip()
    snippets: list[EvidenceSnippet] = []
    seen: set[str] = set()

    # Query the catalog with a trimmed slice (avoid huge blobs)
    primary_q = blob[:100] if blob else ""

    try:
        rows = diseases_store.search_diseases(primary_q, limit=limit + 2)
    except Exception:
        rows = []

    for row in rows:
        name = str(row.get("name") or "").strip()
        if not name or name.lower() in seen:
            continue
        seen.add(name.lower())
        cat = row.get("category")
        cat_s = f" (category: {cat})" if cat else ""
        snippets.append(
            EvidenceSnippet(
                title=name,
                source="MediAssist educational condition index",
                snippet=(
                    f"Matched your message to this non-diagnostic catalog label{cat_s}. "
                    "Use it only for general reading — it is not a diagnosis or treatment plan."
                ),
                url=medlineplus_search_url(name),
            )
        )
        if len(snippets) >= limit - 1:
            break

    # If catalog search weak, try meaningful tokens from user text
    if len(snippets) < 2 and blob:
        try:
            for token in blob.replace(",", " ").split():
                tok = token.strip(".,?!'\"")
                if len(tok) < 4:
                    continue
                for row in diseases_store.search_diseases(tok, limit=3):
                    name = str(row.get("name") or "").strip()
                    if not name or name.lower() in seen:
                        continue
                    seen.add(name.lower())
                    cat = row.get("category")
                    cat_s = f" (category: {cat})" if cat else ""
                    snippets.append(
                        EvidenceSnippet(
                            title=name,
                            source="MediAssist educational condition index",
                            snippet=(
                                f"Related catalog entry{cat_s} for orientation only — "
                                "does not confirm you have this condition."
                            ),
                            url=medlineplus_search_url(name),
                        )
                    )
                    if len(snippets) >= limit - 1:
                        break
                if len(snippets) >= limit - 1:
                    break
        except Exception:
            pass

    core = snippets[: max(0, limit - 1)]

    nih = EvidenceSnippet(
        title="MedlinePlus — topic search",
        source="U.S. National Library of Medicine (NIH)",
        snippet=(
            "Clinician-reviewed overviews and symptom topics. "
            "Use alongside — not instead of — advice from your own healthcare professional."
        ),
        url=medlineplus_search_url(primary_q or "health symptoms"),
    )
    out = core + [nih]
    return out[:limit]
