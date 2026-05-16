import { HealthDecision } from "../models/HealthDecision.model";

export interface HealthDecisionResponse {
  urgency: HealthDecision["urgency"];
  summary: string;
  careSteps: string[];
  education: string[];
  redFlags: string[];
  disclaimer: string;
  fallback?: boolean;
}

export function toHealthDecisionView(
  decision: HealthDecision
): HealthDecisionResponse {
  return {
    urgency: decision.urgency,
    summary: decision.summary,
    careSteps: decision.careSteps,
    education: decision.education,
    redFlags: decision.redFlags,
    disclaimer: decision.disclaimer,
    ...(decision.fallback ? { fallback: true } : {}),
  };
}
