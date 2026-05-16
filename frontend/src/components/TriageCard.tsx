"use client";

import {
  HealthDecisionResponse,
  URGENCY_LABELS,
  UrgencyLevel,
} from "@/lib/types";

const URGENCY_STYLES: Record<UrgencyLevel, string> = {
  self_care:
    "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-100 dark:border-emerald-800",
  see_doctor_soon:
    "bg-yellow-100 text-yellow-900 border-yellow-300 dark:bg-yellow-950 dark:text-yellow-100 dark:border-yellow-800",
  urgent_care:
    "bg-orange-100 text-orange-900 border-orange-300 dark:bg-orange-950 dark:text-orange-100 dark:border-orange-800",
  emergency:
    "bg-red-100 text-red-900 border-red-300 dark:bg-red-950 dark:text-red-100 dark:border-red-800",
};

interface Props {
  decision: HealthDecisionResponse | null;
  loading?: boolean;
}

export default function TriageCard({ decision, loading }: Props) {
  if (loading) {
    return (
      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm text-zinc-500">Analyzing your symptoms…</p>
      </section>
    );
  }

  if (!decision) {
    return (
      <section className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/50">
        <p className="text-sm text-zinc-500">
          Send a message to receive triage guidance.
        </p>
      </section>
    );
  }

  const badgeClass = URGENCY_STYLES[decision.urgency];

  return (
    <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Care decision</h2>
        <span
          className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wide ${badgeClass}`}
        >
          {URGENCY_LABELS[decision.urgency]}
        </span>
      </div>

      {decision.fallback && (
        <p className="text-sm text-amber-700 dark:text-amber-300">
          We used a safe fallback response. Please consult a clinician.
        </p>
      )}

      <p className="text-sm leading-relaxed">{decision.summary}</p>

      {decision.redFlags.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold text-red-700 dark:text-red-400">
            Red flags
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {decision.redFlags.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {decision.careSteps.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold">Suggested care steps</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {decision.careSteps.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {decision.education.length > 0 && (
        <div>
          <h3 className="mb-1 text-sm font-semibold">Education</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {decision.education.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="border-t border-zinc-200 pt-3 text-xs text-zinc-500 dark:border-zinc-700">
        {decision.disclaimer}
      </p>
    </section>
  );
}
