import { parseApiError } from "./api-error";
import { getToken } from "./auth-storage";
import type { ChatSession } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function authHeaders(): HeadersInit {
  const token = getToken();
  if (!token) {
    throw new Error("Sign in to save chats to your account.");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function parseError(res: Response): Promise<string> {
  const data = await res.json().catch(() => ({}));
  return parseApiError(data);
}

export async function fetchChatSessions(): Promise<ChatSession[]> {
  const res = await fetch(`${BASE}/api/chats`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { sessions: ChatSession[] };
  return data.sessions ?? [];
}

export async function syncChatSessions(
  sessions: ChatSession[]
): Promise<ChatSession[]> {
  const res = await fetch(`${BASE}/api/chats`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ sessions }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = (await res.json()) as { sessions: ChatSession[] };
  return data.sessions ?? [];
}

/** Upsert one session — avoids uploading the full history on every message. */
export async function syncChatSession(
  session: ChatSession
): Promise<ChatSession> {
  const res = await fetch(`${BASE}/api/chats/${session.id}`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(session),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as ChatSession;
}
