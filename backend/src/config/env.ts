import dotenv from "dotenv";

dotenv.config();

export const env = {
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? "",
  PORT: parseInt(process.env.PORT ?? "4000", 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? "http://localhost:3000",
};

export function assertGeminiKey(): void {
  if (!env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set in backend/.env");
  }
}
