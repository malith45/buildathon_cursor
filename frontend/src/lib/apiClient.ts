import { parseApiError } from "./api-error";
import { DecisionRequest, HealthDecisionResponse } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export async function postHealthDecision(
  body: DecisionRequest
): Promise<HealthDecisionResponse> {
  const res = await fetch(`${BASE}/api/health/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(parseApiError(data));
  }

  return res.json() as Promise<HealthDecisionResponse>;
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/api/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}
