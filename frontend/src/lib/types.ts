export type UrgencyLevel =
  | "self_care"
  | "see_doctor_soon"
  | "urgent_care"
  | "emergency";

export interface HealthProfile {
  ageRange: string;
  gender?: string;
  conditions: string[];
  allergies: string[];
  medications: string;
  pregnant?: boolean;
}

export type MessageRole = "user" | "model";

export interface ChatMessage {
  role: MessageRole;
  text: string;
}

export interface EvidenceSnippet {
  title: string;
  source: string;
  snippet: string;
  url?: string | null;
}

export interface HealthDecisionResponse {
  urgency: UrgencyLevel;
  summary: string;
  careSteps: string[];
  education: string[];
  redFlags: string[];
  disclaimer: string;
  fallback?: boolean;
  evidenceSnippets?: EvidenceSnippet[];
  safetyEscalation?: boolean | null;
  safetyNote?: string | null;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  lastDecision?: HealthDecisionResponse;
  updatedAt: string;
}

export interface DecisionRequest {
  profile: HealthProfile;
  messages: ChatMessage[];
}

export interface User {
  id: string;
  email: string;
  name: string;
  healthProfile: HealthProfile;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export const DEFAULT_PROFILE: HealthProfile = {
  ageRange: "25-34",
  conditions: [],
  allergies: [],
  medications: "",
};

/** Maps legacy `sex` field from stored profiles to `gender`. */
export function normalizeHealthProfile(
  raw: Partial<HealthProfile> & { sex?: string }
): HealthProfile {
  const { sex, ...rest } = raw;
  const profile: HealthProfile = { ...DEFAULT_PROFILE, ...rest };
  if (!profile.gender && sex) profile.gender = sex;
  return profile;
}

export const URGENCY_LABELS: Record<UrgencyLevel, string> = {
  self_care: "Self-care",
  see_doctor_soon: "See a doctor soon",
  urgent_care: "Urgent care",
  emergency: "Emergency",
};
