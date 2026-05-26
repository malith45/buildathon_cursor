import { hydrateSessionDecisions } from "@/lib/chat-messages";
import { summarizeChatTitle } from "@/lib/session-title";
import { ChatMessage, ChatSession, HealthDecisionResponse } from "./types";
import { createUuid } from "./uuid";

const STORAGE_KEY = "healthcare_sessions";

function sessionsKey(userId?: string | null): string {
  return userId ? `${STORAGE_KEY}_${userId}` : STORAGE_KEY;
}

export function loadSessions(userId?: string | null): ChatSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(sessionsKey(userId));
    if (!raw) return [];
    const sessions = JSON.parse(raw) as ChatSession[];
    return sessions.map(hydrateSessionDecisions);
  } catch {
    return [];
  }
}

export function saveSessions(
  sessions: ChatSession[],
  userId?: string | null
): void {
  try {
    localStorage.setItem(sessionsKey(userId), JSON.stringify(sessions));
  } catch {
    /* private mode / quota */
  }
}

export function createSession(firstMessage: string): ChatSession {
  const title = summarizeChatTitle(firstMessage);
  return {
    id: createUuid(),
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
  const hydrated = hydrateSessionDecisions({
    ...session,
    messages,
    lastDecision: lastDecision ?? session.lastDecision,
    updatedAt: new Date().toISOString(),
  });
  return hydrated;
}

export function clearAllSessions(userId?: string | null): void {
  localStorage.removeItem(sessionsKey(userId));
}
