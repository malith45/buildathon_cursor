"use client";

import {
  HealthDecisionResponse,
  URGENCY_LABELS,
  UrgencyLevel,
} from "@/lib/types";
import { card, cardHeader, sectionSubtitle, sectionTitle } from "@/lib/ui";

const URGENCY_STYLES: Record<UrgencyLevel, string> = {
  self_care: "border-mint/50 bg-mint/15 text-ink",
  see_doctor_soon: "border-lavender/50 bg-lavender/20 text-ink",
  urgent_care: "border-brand/50 bg-brand/10 text-ink",
  emergency: "border-coral/50 bg-coral/15 text-ink",
};

interface Props {
  decision: HealthDecisionResponse | null;
  loading?: boolean;
}

function LoadingSkeleton() {
  return (
    <section className={`${card} p-5`}>
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-1/3 rounded-lg bg-sand" />
        <div className="h-3 w-full rounded-lg bg-sand" />
        <div className="h-3 w-5/6 rounded-lg bg-sand" />
        <div className="h-3 w-4/6 rounded-lg bg-sand" />
      </div>
      <p className="mt-4 text-sm text-stone">Analyzing your symptoms…</p>
    </section>
  );
}

export default function TriageCard({ decision, loading }: Props) {
  if (loading && !decision) {
    return <LoadingSkeleton />;
  }

  if (!decision) {
    return (
      <section
        className={`${card} flex min-h-[200px] flex-col items-center justify-center border-dashed bg-gradient-to-br from-white to-sand/50 p-8 text-center`}
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand/10 text-xl">
          ✦
        </div>
        <p className="text-sm font-medium text-ink">Care decision</p>
        <p className="mt-1 max-w-[200px] text-xs leading-relaxed text-stone">
          Send a message to receive personalized triage guidance.
        </p>
      </section>
    );
  }

  const badgeClass = URGENCY_STYLES[decision.urgency];

  return (
    <section className={`${card} space-y-4`}>
      <div className={cardHeader}>
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className={sectionSubtitle}>Guidance</p>
            <h2 className={sectionTitle}>Care decision</h2>
          </div>
          <span
            className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeClass}`}
          >
            {URGENCY_LABELS[decision.urgency]}
          </span>
        </div>
      </div>

      <div className="space-y-4 px-5 pb-5">
        {decision.fallback && (
          <p className="rounded-xl border border-brand/30 bg-brand/5 px-3 py-2 text-sm text-ink">
            We used a safe fallback response. Please consult a clinician.
          </p>
        )}

        {decision.urgency === "emergency" && (
          <p className="rounded-xl border border-coral/40 bg-coral/10 px-3 py-2 text-sm font-medium text-ink">
            If this feels life-threatening, call emergency services now.
          </p>
        )}

        <p className="text-sm leading-relaxed text-ink">{decision.summary}</p>

        {decision.redFlags.length > 0 && (
          <div className="rounded-xl border border-coral/30 bg-coral/5 p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-coral">
              Red flags
            </h3>
            <ul className="space-y-1.5 text-sm text-ink">
              {decision.redFlags.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-coral">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {decision.careSteps.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone">
              Suggested care steps
            </h3>
            <ul className="space-y-1.5 text-sm text-ink">
              {decision.careSteps.map((item, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-semibold text-mint">{i + 1}.</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        {decision.education.length > 0 && (
          <div className="rounded-xl bg-sand/60 p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone">
              Education
            </h3>
            <ul className="space-y-1.5 text-sm text-ink">
              {decision.education.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="border-t border-line/60 pt-3 text-xs leading-relaxed text-stone">
          {decision.disclaimer}
        </p>
      </div>
    </section>
  );
}
