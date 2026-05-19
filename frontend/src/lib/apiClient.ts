import { parseApiError } from "./api-error";
import { normalizeDecisionResponse } from "./decision-normalize";
import { messagesForApi } from "./chat-messages";
import { DecisionRequest, HealthDecisionResponse } from "./types";

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
      "On Netlify, set NEXT_PUBLIC_API_URL to your Render API URL and redeploy."
    );
  }
  return "";
}

export async function postHealthDecision(
  body: DecisionRequest
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
    });
  } catch {
    throw new Error(
      `Failed to reach the API at ${BASE}.${apiReachabilityHint()}`
    );
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    const detail = parseApiError(data);
    throw new Error(
      `${detail} (HTTP ${res.status} from ${BASE})${apiReachabilityHint()}`
    );
  }

  const raw = (await res.json()) as HealthDecisionResponse;
  return normalizeDecisionResponse(raw, body.messages);
}
