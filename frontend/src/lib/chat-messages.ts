import { normalizeDecisionResponse } from "@/lib/decision-normalize";
import {
  ChatMessage,
  ChatSession,
  HealthDecisionResponse,
} from "@/lib/types";

/** Strip decision payloads before sending messages to the API. */
export function messagesForApi(messages: ChatMessage[]): ChatMessage[] {
  return messages.map(({ role, text }) => ({ role, text }));
}

export function decisionForMessage(
  message: ChatMessage,
  session?: ChatSession | null
): HealthDecisionResponse | null {
  if (message.role !== "model") return null;
  if (message.decision) {
    return normalizeDecisionResponse(message.decision, [message]);
  }
  if (session?.lastDecision) {
    const idx = session.messages.indexOf(message);
    let lastModel = -1;
    for (let i = session.messages.length - 1; i >= 0; i--) {
      if (session.messages[i].role === "model") {
        lastModel = i;
        break;
      }
    }
    if (idx >= 0 && idx === lastModel) {
      return normalizeDecisionResponse(session.lastDecision, session.messages);
    }
  }
  return null;
}

/** Attach `lastDecision` to the last model message when loading legacy sessions. */
export function hydrateSessionDecisions(session: ChatSession): ChatSession {
  if (!session.lastDecision) return session;
  let lastModel = -1;
  for (let i = session.messages.length - 1; i >= 0; i--) {
    if (session.messages[i].role === "model") {
      lastModel = i;
      break;
    }
  }
  if (lastModel < 0) return session;
  if (session.messages[lastModel].decision) return session;
  const messages = [...session.messages];
  messages[lastModel] = {
    ...messages[lastModel],
    decision: session.lastDecision,
  };
  return { ...session, messages };
}

export function hydrateAllSessions(sessions: ChatSession[]): ChatSession[] {
  return sessions.map(hydrateSessionDecisions);
}

export function withModelReply(
  messages: ChatMessage[],
  summary: string,
  decision: HealthDecisionResponse
): ChatMessage[] {
  return [
    ...messages,
    { role: "model", text: summary, decision },
  ];
}

export function isFirstModelTurn(messages: ChatMessage[], modelIndex: number): boolean {
  return messages.findIndex((m) => m.role === "model") === modelIndex;
}
