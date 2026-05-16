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

export interface AiProbe {
  configured: boolean;
  working: boolean;
  message: string;
  model: string | null;
  sample?: string | null;
}

export interface SystemHealth {
  status: string;
  aiConfigured: boolean;
  aiModel?: string;
  storageConfigured?: boolean;
  storageConnected: boolean;
  storageMessage?: string | null;
  storageBucket?: string | null;
  diseasesReady?: boolean;
  ai?: AiProbe;
}

export async function fetchSystemHealth(probe = false): Promise<SystemHealth> {
  const url = probe ? `${BASE}/api/health?probe=true` : `${BASE}/api/health`;
  const res = await fetch(url, { method: "GET" });
  if (!res.ok) {
    throw new Error(`Health check failed (${res.status})`);
  }
  return res.json() as Promise<SystemHealth>;
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const health = await fetchSystemHealth(false);
    return health.status === "ok";
  } catch {
    return false;
  }
}
