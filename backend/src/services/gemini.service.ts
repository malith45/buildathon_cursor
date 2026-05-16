import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "../config/env";

const MODEL = "gemini-2.0-flash";

export class GeminiService {
  private client: GoogleGenerativeAI;

  constructor() {
    this.client = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }

  async generateJson(
    systemInstruction: string,
    userContent: string
  ): Promise<string> {
    const model = this.client.getGenerativeModel({
      model: MODEL,
      systemInstruction,
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const result = await model.generateContent(userContent);
    const text = result.response.text();
    if (!text) {
      throw new Error("Empty response from Gemini");
    }
    return text;
  }
}

export const geminiService = new GeminiService();
