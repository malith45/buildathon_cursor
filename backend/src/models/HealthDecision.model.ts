export type UrgencyLevel =
  | "self_care"
  | "see_doctor_soon"
  | "urgent_care"
  | "emergency";

export interface HealthDecision {
  urgency: UrgencyLevel;
  summary: string;
  careSteps: string[];
  education: string[];
  redFlags: string[];
  disclaimer: string;
  fallback?: boolean;
}

export interface DecisionRequest {
  profile: import("./HealthProfile.model").HealthProfile;
  messages: import("./ChatMessage.model").ChatMessage[];
}
