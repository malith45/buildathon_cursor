import { parseApiError } from "./api-error";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export interface Disease {
  id: number;
  name: string;
  category: string | null;
}

export async function searchDiseases(
  search: string,
  limit = 20,
  signal?: AbortSignal
): Promise<Disease[]> {
  const params = new URLSearchParams();
  if (search.trim()) params.set("search", search.trim());
  params.set("limit", String(limit));

  const res = await fetch(`${BASE}/api/diseases?${params}`, {
    method: "GET",
    signal,
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(parseApiError(data));
  }

  const data = (await res.json()) as { diseases: Disease[] };
  return data.diseases ?? [];
}
