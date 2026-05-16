import { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error(err);
  const message =
    err.message.includes("GEMINI_API_KEY") ||
    err.message.includes("not set")
      ? "Server is not configured with a Gemini API key."
      : "An unexpected error occurred.";

  res.status(500).json({ error: message });
}
