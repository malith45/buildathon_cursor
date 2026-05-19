import { HealthDecisionResponse, URGENCY_LABELS } from "@/lib/types";

/** Plain text for browser text-to-speech from a triage response. */
export function decisionToSpeechText(d: HealthDecisionResponse): string {
  const parts: string[] = [
    `Recommendation: ${URGENCY_LABELS[d.urgency]}.`,
    d.summary,
  ];
  if (d.safetyNote) parts.push(d.safetyNote);
  if (d.redFlags.length) {
    parts.push(`Red flags. ${d.redFlags.join(". ")}`);
  }
  if (d.careSteps.length) {
    parts.push(`What to do. ${d.careSteps.join(". ")}`);
  }
  if (d.education.length) {
    parts.push(d.education.join(". "));
  }
  parts.push(d.disclaimer);
  return parts.filter(Boolean).join(" ");
}
