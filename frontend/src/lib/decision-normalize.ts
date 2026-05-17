import type { ChatMessage, EvidenceSnippet, HealthDecisionResponse } from "./types";

export function medlinePlusSearchUrl(query: string): string {
  const q = encodeURIComponent(query.trim().slice(0, 80) || "health symptoms");
  return `https://vsearch.nlm.nih.gov/vivisimo/cgi-bin/query-meta?v:project=medlineplus&v:sources=medlineplus-bundle&query=${q}`;
}

export function fallbackEvidenceFromMessages(
  messages: ChatMessage[]
): EvidenceSnippet[] {
  const blob = messages
    .filter((m) => m.role === "user")
    .map((m) => m.text)
    .join(" ");
  return [
    {
      title: "MedlinePlus — topic search",
      source: "U.S. National Library of Medicine (NIH)",
      snippet:
        "Clinician-reviewed overviews and symptom topics. Use alongside — not instead of — advice from your healthcare professional.",
      url: medlinePlusSearchUrl(blob),
    },
  ];
}

/** Ensures evidenceSnippets is present (handles older API builds / empty retrieval). */
export function normalizeDecisionResponse(
  raw: HealthDecisionResponse,
  messages: ChatMessage[]
): HealthDecisionResponse {
  const fromApi =
    raw.evidenceSnippets ??
    (raw as HealthDecisionResponse & { evidence_snippets?: EvidenceSnippet[] })
      .evidence_snippets ??
    [];

  const evidenceSnippets =
    fromApi.length > 0 ? fromApi : fallbackEvidenceFromMessages(messages);

  return { ...raw, evidenceSnippets };
}
