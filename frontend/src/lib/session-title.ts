import type { ChatSession } from "./types";

const MAX_TITLE_LEN = 42;

function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Strip filler openers so the sidebar shows the symptom topic, not the full prompt. */
function stripLeadIns(text: string): string {
  let t = text.trim();
  const patterns = [
    /^(hi|hello|hey)[,!.]?\s+/i,
    /^(please help[,!.]?\s*)/i,
    /^(i(?:'ve| have| am|'m))\s+(been\s+|had\s+|got\s+|getting\s+|feeling\s+|experiencing\s+)?/i,
    /^(for\s+(?:the\s+)?(?:past|last)\s+\d+\s+\w+,?\s*)/i,
    /^(about\s+)?/i,
  ];
  for (const re of patterns) {
    const next = t.replace(re, "");
    if (next.length >= 8) t = next;
  }
  t = t.replace(/^(?:a|an|the)\s+/i, "");
  return t.trim();
}

/** First clause/sentence — avoids mid-sentence ellipsis on long prompts. */
function firstClause(text: string): string {
  const match = text.match(/^[^.!?\n]+/);
  return (match?.[0] ?? text).trim();
}

/**
 * Short label for sidebar rows from the user's first message.
 * Word-boundary trim with a single ellipsis when needed (no raw 40-char chop).
 */
export function summarizeChatTitle(raw: string): string {
  const normalized = raw.replace(/\s+/g, " ").trim();
  if (!normalized) return "New chat";

  let topic = stripLeadIns(firstClause(normalized));
  if (!topic) topic = normalized;

  if (topic.length <= MAX_TITLE_LEN) return capitalizeFirst(topic);

  const slice = topic.slice(0, MAX_TITLE_LEN);
  const lastSpace = slice.lastIndexOf(" ");
  const cut =
    lastSpace >= Math.floor(MAX_TITLE_LEN * 0.45)
      ? slice.slice(0, lastSpace)
      : slice.trimEnd();

  return capitalizeFirst(`${cut}…`);
}

/** Prefer first user message over stored title (fixes legacy truncated titles). */
export function sessionDisplayTitle(session: ChatSession): string {
  const firstUser = session.messages.find((m) => m.role === "user");
  const source = firstUser?.text?.trim() || session.title?.trim();
  if (!source) return "New chat";
  return summarizeChatTitle(source);
}
