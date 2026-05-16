import { ChatMessage, ChatSession, HealthDecisionResponse } from "./types";

const STORAGE_KEY = "healthcare_sessions";

function sessionsKey(userId?: string | null): string {
  return userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
}

export function loadSessions(userId?: string | null): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(sessionsKey(userId));
    if (!raw) return [];
    return JSON.parse(raw) as ChatSession[];
  } catch {
    return [];
  }
}

export function saveSessions(
  sessions: ChatSession[],
  userId?: string | null
): void {
  localStorage.setItem(sessionsKey(userId), JSON.stringify(sessions));
}

export function createSession(firstMessage: string): ChatSession {
  const title =
    firstMessage.length > 40
      ? `${firstMessage.slice(0, 40)}…`
      : firstMessage;
  return {
    id: crypto.randomUUID(),
    title: title || "New chat",
    messages: [],
    updatedAt: new Date().toISOString(),
  };
}

export function upsertSession(
  sessions: ChatSession[],
  session: ChatSession
): ChatSession[] {
  const idx = sessions.findIndex((s) => s.id === session.id);
  const next = [...sessions];
  if (idx >= 0) next[idx] = session;
  else next.unshift(session);
  return next.sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function updateSessionMessages(
  session: ChatSession,
  messages: ChatMessage[],
  lastDecision?: HealthDecisionResponse
): ChatSession {
  return {
    ...session,
    messages,
    lastDecision: lastDecision ?? session.lastDecision,
    updatedAt: new Date().toISOString(),
  };
}

export function clearAllSessions(userId?: string | null): void {
  localStorage.removeItem(sessionsKey(userId));
}
