import { parseApiError } from "./api-error";
import { normalizeDecisionResponse } from "./decision-normalize";
import { messagesForApi } from "./chat-messages";
import {
  DecisionRequest,
  HealthDecisionResponse,
  UrgencyLevel,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function apiReachabilityHint(): string {
  if (typeof window === "undefined") return "";
  const onLocalSite =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const apiIsLocal =
    BASE.includes("localhost") || BASE.includes("127.0.0.1");
  if (!onLocalSite && apiIsLocal) {
    return (
      " This site is calling http://localhost:4000, which only works on your PC. " +
      "On Vercel, set NEXT_PUBLIC_API_URL to your Railway API URL and redeploy."
    );
  }
  return "";
}

export class DecisionAbortedError extends Error {
  constructor() {
    super("Request cancelled");
    this.name = "DecisionAbortedError";
  }
}

export class DecisionRequestError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "DecisionRequestError";
    this.status = status;
  }
}

export type DecisionPartial = {
  urgency?: UrgencyLevel;
  summary?: string;
};

export type DecisionStreamCallbacks = {
  signal?: AbortSignal;
  onStage?: (stage: string) => void;
  onPartial?: (partial: DecisionPartial) => void;
};

/** User-facing title + message for triage failures. */
export function formatDecisionError(err: unknown): {
  title: string;
  message: string;
} {
  if (err instanceof DecisionAbortedError) {
    return {
      title: "Stopped",
      message: "Guidance request was cancelled.",
    };
  }
  if (err instanceof DecisionRequestError) {
    if (err.status === 429) {
      return {
        title: "Too many requests",
        message:
          "Please wait a minute before trying again. This limit protects the service.",
      };
    }
    if (err.status === 503) {
      return {
        title: "AI service unavailable",
        message:
          err.message ||
          "The guidance service is temporarily down. Check your connection or try again shortly.",
      };
    }
    return {
      title: "Could not get guidance",
      message: `${err.message}${apiReachabilityHint()}`,
    };
  }
  if (err instanceof Error) {
    return {
      title: "Could not get guidance",
      message: `${err.message}${apiReachabilityHint()}`,
    };
  }
  return {
    title: "Could not get guidance",
    message: `Something went wrong.${apiReachabilityHint()}`,
  };
}

export function formatFallbackNotice(result: HealthDecisionResponse): {
  show: boolean;
  title: string;
  message: string;
} {
  if (!result.fallback) {
    return { show: false, title: "", message: "" };
  }
  return {
    show: true,
    title: "Limited AI response",
    message:
      "We could not fully analyze your symptoms with AI. The guidance below is a safe generic checklist — not personalized advice. Try again or check that the API server has a valid OPENAI_API_KEY.",
  };
}

async function parseErrorResponse(res: Response): Promise<never> {
  const data = await res.json().catch(() => ({}));
  const detail = parseApiError(data);
  throw new DecisionRequestError(
    `${detail} (HTTP ${res.status} from ${BASE})${apiReachabilityHint()}`,
    res.status
  );
}

export async function postHealthDecision(
  body: DecisionRequest,
  options?: { signal?: AbortSignal }
): Promise<HealthDecisionResponse> {
  const url = `${BASE}/api/health/decision`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: body.profile,
        messages: messagesForApi(body.messages),
      }),
      signal: options?.signal,
    });
  } catch (err) {
    if (options?.signal?.aborted) throw new DecisionAbortedError();
    throw new Error(
      `Failed to reach the API at ${BASE}.${apiReachabilityHint()}`
    );
  }

  if (!res.ok) await parseErrorResponse(res);

  const raw = (await res.json()) as HealthDecisionResponse;
  return normalizeDecisionResponse(raw, body.messages);
}

/** Stream triage with staged partial urgency/summary, then full decision. */
export async function postHealthDecisionStream(
  body: DecisionRequest,
  callbacks: DecisionStreamCallbacks = {}
): Promise<HealthDecisionResponse> {
  const url = `${BASE}/api/health/decision/stream`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile: body.profile,
        messages: messagesForApi(body.messages),
      }),
      signal: callbacks.signal,
    });
  } catch (err) {
    if (callbacks.signal?.aborted) throw new DecisionAbortedError();
    throw new Error(
      `Failed to reach the API at ${BASE}.${apiReachabilityHint()}`
    );
  }

  if (res.status === 404) {
    return postHealthDecision(body, { signal: callbacks.signal });
  }

  if (!res.ok) await parseErrorResponse(res);

  const reader = res.body?.getReader();
  if (!reader) {
    return postHealthDecision(body, { signal: callbacks.signal });
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let finalDecision: HealthDecisionResponse | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (callbacks.signal?.aborted) {
      await reader.cancel().catch(() => undefined);
      throw new DecisionAbortedError();
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = JSON.parse(line.slice(6)) as Record<string, unknown>;
      const type = payload.type as string;

      if (type === "stage" && typeof payload.stage === "string") {
        callbacks.onStage?.(payload.stage);
      } else if (type === "partial") {
        callbacks.onPartial?.({
          urgency: payload.urgency as UrgencyLevel | undefined,
          summary:
            typeof payload.summary === "string" ? payload.summary : undefined,
        });
      } else if (type === "complete" && payload.decision) {
        finalDecision = normalizeDecisionResponse(
          payload.decision as HealthDecisionResponse,
          body.messages
        );
      } else if (type === "error") {
        const status =
          typeof payload.status === "number" ? payload.status : 500;
        const message =
          typeof payload.message === "string"
            ? payload.message
            : "Request failed";
        throw new DecisionRequestError(message, status);
      }
    }
  }

  if (finalDecision) return finalDecision;
  return postHealthDecision(body, { signal: callbacks.signal });
}
