"use client";

import { DecisionPartial } from "@/lib/decision-api";
import { URGENCY_LABELS, UrgencyLevel } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const URGENCY_CHIP: Record<UrgencyLevel, string> = {
  self_care: "bg-mint/20 text-mint",
  see_doctor_soon: "bg-lavender/25 text-lavender",
  urgent_care: "bg-primary/20 text-primary",
  emergency: "bg-coral/25 text-coral",
};

interface Props {
  partial: DecisionPartial | null;
  stage?: string;
}

export default function StreamingDecisionPreview({ partial, stage }: Props) {
  const urgency = partial?.urgency;
  const summary = partial?.summary?.trim();

  return (
    <div className="min-w-0 flex-1 overflow-hidden rounded-2xl border border-line/60 bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-line/50 bg-muted/20 px-3 py-2 sm:px-4">
        <Loader2 className="size-3.5 shrink-0 animate-spin text-primary/70" />
        <span className="text-xs font-medium text-muted-foreground">
          {stage === "analyzing" ? "Analyzing symptoms…" : "Preparing guidance…"}
        </span>
        {urgency ? (
          <span
            className={cn(
              "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              URGENCY_CHIP[urgency]
            )}
          >
            {URGENCY_LABELS[urgency]}
          </span>
        ) : null}
      </div>
      <div className="px-3 py-3 sm:px-4 sm:py-3.5">
        {summary ? (
          <p className="animate-fade-in text-sm leading-relaxed text-foreground/90">
            {summary}
            <span className="ml-0.5 inline-block w-1.5 animate-pulse bg-primary/60 align-middle" />
          </p>
        ) : (
          <div className="space-y-2">
            <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-3 w-3/5 animate-pulse rounded bg-muted/80" />
          </div>
        )}
      </div>
    </div>
  );
}
