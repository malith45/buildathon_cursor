import type { ChatSession } from "./types";

/** Saved on the session object. */
const STORED_TITLE_MAX = 72;
/** Sidebar row — ChatGPT-like preview length, not the full prompt. */
const SIDEBAR_TITLE_MAX = 52;

function capitalizeFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function trimAtWord(text: string, maxLen: number, minWordBreak: number): string {
  if (text.length <= maxLen) return text;
  const slice = text.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(" ");
  const cut =
    lastSpace >= minWordBreak ? slice.slice(0, lastSpace) : slice.trimEnd();
  return `${cut}…`;
}

function firstClause(text: string): string {
  const match = text.match(/^[^.!?\n]+/);
  return (match?.[0] ?? text).trim();
}

/** Trim conversational openers so titles read like topics, not full prompts. */
function stripConversationalOpeners(text: string): string {
  let t = text.trim();
  const patterns = [
    /^(hi|hello|hey)[,!.]?\s+/i,
    /^(please help[,!.]?\s*)/i,
    /^(i(?:'ve| have|'m))\s+(been\s+|had\s+|felt\s+|got\s+|gotten\s+|noticed\s+|experiencing\s+|having\s+|feeling\s+)?/i,
    /^(for\s+(?:the\s+)?(?:past|last)\s+\d+\s+\w+,?\s*)/i,
  ];
  for (const re of patterns) {
    const next = t.replace(re, "");
    if (next.length >= 8) t = next;
  }
  t = t.replace(/^(?:a|an|the)\s+/i, "");
  return t.trim();
}

/**
 * Core topic from the first user message (stored title + tooltip baseline).
 */
export function chatTitleFromMessage(raw: string): string {
  const line =
    raw.replace(/\s+/g, " ").trim().split("\n").find((l) => l.trim()) ?? "";
  if (!line) return "New chat";

  let t = stripConversationalOpeners(firstClause(line));
  if (!t) t = firstClause(line);

  return capitalizeFirst(t);
}

function firstUserText(session: ChatSession): string {
  const firstUser = session.messages.find((m) => m.role === "user");
  return firstUser?.text?.trim() || "";
}

function buildChatTitle(session: ChatSession): string {
  const user = firstUserText(session);
  if (user) return chatTitleFromMessage(user);

  const stored = session.title?.trim();
  if (stored && stored !== "New chat") return stored;

  return "New chat";
}

export function summarizeSessionTitle(session: ChatSession): string {
  const title = buildChatTitle(session);
  if (title === "New chat") return title;
  return trimAtWord(title, STORED_TITLE_MAX, 28);
}

export function summarizeChatTitle(raw: string): string {
  const title = chatTitleFromMessage(raw);
  if (title === "New chat") return title;
  return trimAtWord(title, STORED_TITLE_MAX, 28);
}

/** Sidebar list — short preview (~ChatGPT width), word-safe ellipsis. */
export function sessionDisplayTitle(session: ChatSession): string {
  const title = buildChatTitle(session);
  if (title === "New chat") return title;
  return trimAtWord(title, SIDEBAR_TITLE_MAX, 22);
}

export function sessionTooltipTitle(session: ChatSession): string {
  const user = firstUserText(session).replace(/\s+/g, " ").trim();
  if (user) return user;
  const title = session.title?.trim();
  return title || "New chat";
}
