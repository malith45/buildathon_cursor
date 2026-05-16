import { ChatMessage } from "../models/ChatMessage.model";
import { HealthProfile } from "../models/HealthProfile.model";
import {
  HealthDecision,
  UrgencyLevel,
} from "../models/HealthDecision.model";
import { SYSTEM_PROMPT } from "../prompts/systemPrompt";
import { geminiService } from "./gemini.service";

const URGENCY_VALUES: UrgencyLevel[] = [
  "self_care",
  "see_doctor_soon",
  "urgent_care",
  "emergency",
];

const FALLBACK_DECISION: HealthDecision = {
  urgency: "see_doctor_soon",
  summary:
    "We could not process your request reliably. Please consult a healthcare professional for personalized advice.",
  careSteps: [
    "Monitor your symptoms and note any changes.",
    "Contact a doctor or nurse line if symptoms worsen.",
  ],
  education: [
    "Online tools cannot replace an in-person medical evaluation.",
  ],
  redFlags: [
    "Seek emergency care immediately for chest pain, trouble breathing, severe bleeding, or sudden confusion.",
  ],
  disclaimer:
    "This information is for educational purposes only and is not a substitute for professional medical advice.",
  fallback: true,
};

function buildUserContent(
  profile: HealthProfile,
  messages: ChatMessage[]
): string {
  const history = messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
    .join("\n");

  return `Health profile:
- Age range: ${profile.ageRange}
- Sex: ${profile.sex ?? "not specified"}
- Chronic conditions: ${profile.conditions.length ? profile.conditions.join(", ") : "none listed"}
- Allergies: ${profile.allergies.length ? profile.allergies.join(", ") : "none listed"}
- Medications: ${profile.medications || "none listed"}
- Pregnant: ${profile.pregnant ? "yes" : "no"}

Conversation:
${history}

Provide a health decision JSON for the user's latest concern based on the full conversation.`;
}

function parseDecision(raw: string): HealthDecision | null {
  try {
    const parsed = JSON.parse(raw) as Partial<HealthDecision>;
    if (
      !parsed.urgency ||
      !URGENCY_VALUES.includes(parsed.urgency as UrgencyLevel)
    ) {
      return null;
    }
    return {
      urgency: parsed.urgency as UrgencyLevel,
      summary: String(parsed.summary ?? ""),
      careSteps: Array.isArray(parsed.careSteps)
        ? parsed.careSteps.map(String)
        : [],
      education: Array.isArray(parsed.education)
        ? parsed.education.map(String)
        : [],
      redFlags: Array.isArray(parsed.redFlags)
        ? parsed.redFlags.map(String)
        : [],
      disclaimer:
        String(parsed.disclaimer) ||
        "This information is for educational purposes only and is not a substitute for professional medical advice.",
    };
  } catch {
    return null;
  }
}

export class HealthDecisionService {
  async decide(
    profile: HealthProfile,
    messages: ChatMessage[]
  ): Promise<HealthDecision> {
    const userContent = buildUserContent(profile, messages);

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await geminiService.generateJson(
          SYSTEM_PROMPT,
          userContent
        );
        const decision = parseDecision(raw);
        if (decision) return decision;
      } catch {
        /* retry once */
      }
    }

    return { ...FALLBACK_DECISION };
  }
}

export const healthDecisionService = new HealthDecisionService();
