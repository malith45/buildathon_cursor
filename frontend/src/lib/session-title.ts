import type { ChatSession } from "./types";

/** Cap for persisted `session.title` only — display uses CSS truncate. */
const STORED_TITLE_MAX = 80;

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

/** First clause/sentence — avoids multi-line prompts in the sidebar. */
function firstClause(text: string): string {
  const match = text.match(/^[^.!?\n]+/);
  return (match?.[0] ?? text).trim();
}

/** Readable topic from the user's message (no length chop — sidebar truncates visually). */
export function cleanSessionTopic(raw: string): string {
  const normalized = raw.replace(/\s+/g, " ").trim();
  if (!normalized) return "New chat";

  let topic = stripLeadIns(firstClause(normalized));
  if (!topic) topic = normalized;

  return capitalizeFirst(topic);
}

function trimForStorage(topic: string): string {
  if (topic.length <= STORED_TITLE_MAX) return topic;

  const slice = topic.slice(0, STORED_TITLE_MAX);
  const lastSpace = slice.lastIndexOf(" ");
  const cut =
    lastSpace >= Math.floor(STORED_TITLE_MAX * 0.5)
      ? slice.slice(0, lastSpace)
      : slice.trimEnd();

  return `${cut}…`;
}

/** Title saved on the session object (may be long; UI still prefers first user message). */
export function summarizeChatTitle(raw: string): string {
  const topic = cleanSessionTopic(raw);
  if (topic === "New chat") return topic;
  return trimForStorage(topic);
}

/** Label in the sidebar — uses full cleaned topic; ellipsis only when the row runs out of width. */
export function sessionDisplayTitle(session: ChatSession): string {
  const firstUser = session.messages.find((m) => m.role === "user");
  const source = firstUser?.text?.trim() || session.title?.trim();
  if (!source) return "New chat";
  return cleanSessionTopic(source);
}

/** Native tooltip — full first message when truncated in the list. */
export function sessionTooltipTitle(session: ChatSession): string {
  const firstUser = session.messages.find((m) => m.role === "user");
  const source = firstUser?.text?.trim() || session.title?.trim();
  if (!source) return "New chat";
  return source.replace(/\s+/g, " ").trim();
}
