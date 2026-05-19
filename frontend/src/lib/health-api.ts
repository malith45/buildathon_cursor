import { parseApiError } from "./api-error";
import { getApiBaseUrl } from "./api-config";

export interface HealthStatus {
  status: string;
  aiConfigured: boolean;
  storageConfigured: boolean;
  storageConnected: boolean;
  storageMessage: string | null;
}

export async function fetchHealthStatus(): Promise<HealthStatus> {
  const res = await fetch(`${getApiBaseUrl()}/api/health`, { cache: "no-store" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(parseApiError(data));
  }
  return res.json() as Promise<HealthStatus>;
}
