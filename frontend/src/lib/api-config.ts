const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export function getApiBaseUrl(): string {
  return API_BASE;
}

/** Production site pointing at localhost — common Vercel/Netlify misconfiguration. */
export function isMisconfiguredApiUrl(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  const onLocal = host === "localhost" || host === "127.0.0.1";
  const apiIsLocal =
    API_BASE.includes("localhost") || API_BASE.includes("127.0.0.1");
  return !onLocal && apiIsLocal;
}
