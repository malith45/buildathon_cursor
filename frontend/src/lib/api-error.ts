/** Parse FastAPI / Express error JSON into a user-visible message. */
export function parseApiError(data: unknown): string {
  if (!data || typeof data !== "object") return "Request failed";
  const body = data as Record<string, unknown>;

  if (typeof body.error === "string") return body.error;

  const detail = body.detail;
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail) && detail.length > 0) {
    const first = detail[0] as { msg?: string };
    if (first?.msg) return first.msg;
  }

  if (body.details && typeof body.details === "object") {
    const values = Object.values(body.details as Record<string, string[]>).flat();
    if (values[0]) return values[0];
  }

  return "Request failed";
}
