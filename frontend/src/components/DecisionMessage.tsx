"use client";

import {
  HealthDecisionResponse,
  URGENCY_LABELS,
  UrgencyLevel,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  AlertOctagon,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  HeartPulse,
  Info,
  Link2,
  ShieldAlert,
  Siren,
  Stethoscope,
} from "lucide-react";
import { ComponentType, SVGProps } from "react";

interface UrgencyStyle {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  banner: string;
  iconWrap: string;
  description: string;
}

/** Show the “Recommendation” strip only when in-person / professional care is indicated. */
function showRecommendationBanner(urgency: UrgencyLevel): boolean {
  return urgency !== "self_care";
}

const URGENCY_STYLES: Record<UrgencyLevel, UrgencyStyle> = {
  self_care: {
    label: URGENCY_LABELS.self_care,
    icon: CheckCircle2,
    banner: "bg-linear-to-br from-mint/20 via-mint/10 to-transparent",
    iconWrap: "bg-mint/25 text-mint",
    description: "Symptoms can usually be managed at home.",
  },
  see_doctor_soon: {
    label: URGENCY_LABELS.see_doctor_soon,
    icon: Clock,
    banner: "bg-linear-to-br from-lavender/25 via-lavender/10 to-transparent",
    iconWrap: "bg-lavender/30 text-lavender",
    description: "Plan a clinic visit in the next few days.",
  },
  urgent_care: {
    label: URGENCY_LABELS.urgent_care,
    icon: ShieldAlert,
    banner: "bg-linear-to-br from-primary/25 via-primary/10 to-transparent",
    iconWrap: "bg-primary/25 text-primary",
    description: "Seek care today — same-day clinic or urgent care.",
  },
  emergency: {
    label: URGENCY_LABELS.emergency,
    icon: Siren,
    banner: "bg-linear-to-br from-coral/30 via-coral/15 to-transparent",
    iconWrap: "bg-coral/25 text-coral",
    description: "Call emergency services immediately.",
  },
};

interface Props {
  decision: HealthDecisionResponse;
  /** First model reply in this thread — show the legal / safety lead-in above triage. */
  showLeadDisclaimer?: boolean;
}

function Section({
  icon: Icon,
  title,
  iconWrap,
  delay,
  children,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  iconWrap: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <div
      className="animate-fade-up space-y-1.5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex size-6 items-center justify-center rounded-md",
            iconWrap
          )}
        >
          <Icon className="size-3.5" />
        </div>
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h4>
      </div>
      <div className="pl-8">{children}</div>
    </div>
  );
}

export default function DecisionMessage({
  decision,
  showLeadDisclaimer = false,
}: Props) {
  const style = URGENCY_STYLES[decision.urgency];
  const Icon = style.icon;
  const showRec = showRecommendationBanner(decision.urgency);

  return (
    <div className="animate-fade-up flex w-full flex-col overflow-hidden rounded-2xl rounded-tl-sm border border-line/60 bg-card shadow-sm">
      {showLeadDisclaimer && (
        <div
          className="flex gap-2.5 border-b border-line/60 bg-muted/35 px-4 py-2.5 text-[11px] leading-snug text-muted-foreground dark:bg-muted/25"
          role="note"
        >
          <ShieldAlert
            className="mt-0.5 size-3.5 shrink-0 text-lavender"
            aria-hidden
          />
          <p>
            <span className="font-medium text-foreground/85">
              Not medical advice.
            </span>{" "}
            In an emergency, call your local emergency number.
          </p>
        </div>
      )}
      {/* Recommendation strip: only when professional care is suggested (not self-care). */}
      {showRec && (
        <div className={cn("flex items-start gap-3 px-4 py-3.5", style.banner)}>
          <div
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-white/30",
              style.iconWrap
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wider text-foreground/70">
              Recommendation
            </p>
            <h3 className="font-heading text-base font-bold leading-tight text-foreground">
              {style.label}
            </h3>
            <p className="mt-0.5 text-xs leading-relaxed text-foreground/75">
              {style.description}
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4 px-4 py-4">
        {decision.safetyEscalation && decision.safetyNote && (
          <div className="animate-fade-in flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs leading-relaxed dark:border-amber-500/35 dark:bg-amber-500/15">
            <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                Extra safety check
              </p>
              <p className="mt-0.5 text-foreground/90">
                {decision.safetyNote}
              </p>
            </div>
          </div>
        )}

        {decision.fallback && (
          <div className="animate-fade-in flex gap-2 rounded-lg border border-amber-300/50 bg-amber-50/60 p-2.5 text-xs leading-relaxed dark:border-amber-500/30 dark:bg-amber-500/10">
            <Info className="mt-0.5 size-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200">
                Fallback response
              </p>
              <p className="mt-0.5 text-amber-800 dark:text-amber-300/90">
                We used safe fallback guidance. Please consult a clinician.
              </p>
            </div>
          </div>
        )}

        {decision.urgency === "emergency" && (
          <div className="animate-fade-in flex gap-2 rounded-lg border border-coral/40 bg-coral/10 p-2.5 text-xs leading-relaxed">
            <AlertOctagon className="mt-0.5 size-4 shrink-0 text-coral" />
            <div>
              <p className="font-semibold text-coral">
                Call emergency services
              </p>
              <p className="mt-0.5 text-foreground/80">
                If this feels life-threatening, call your local emergency
                number now.
              </p>
            </div>
          </div>
        )}

        <Section
          icon={HeartPulse}
          iconWrap="bg-primary/12 text-primary"
          title="Summary"
          delay={50}
        >
          <p className="text-sm leading-relaxed text-foreground">
            {decision.summary}
          </p>
        </Section>

        {decision.redFlags.length > 0 && (
          <Section
            icon={AlertTriangle}
            iconWrap="bg-coral/15 text-coral"
            title="Red flags — seek care if you notice"
            delay={120}
          >
            <ul className="space-y-1.5 text-sm">
              {decision.redFlags.map((item, i) => (
                <li key={i} className="flex gap-2 text-foreground/90">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-coral" />
                  <span className="flex-1 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {decision.careSteps.length > 0 && (
          <Section
            icon={Stethoscope}
            iconWrap="bg-mint/20 text-mint"
            title="What to do"
            delay={180}
          >
            <ol className="space-y-2 text-sm">
              {decision.careSteps.map((item, i) => (
                <li key={i} className="flex gap-2.5 text-foreground/90">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-mint/20 text-[11px] font-semibold text-mint">
                    {i + 1}
                  </span>
                  <span className="flex-1 leading-relaxed">{item}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        {decision.education.length > 0 && (
          <Section
            icon={BookOpen}
            iconWrap="bg-lavender/20 text-lavender"
            title="Good to know"
            delay={240}
          >
            <ul className="space-y-1.5 text-sm">
              {decision.education.map((item, i) => (
                <li key={i} className="flex gap-2 text-foreground/85">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-lavender" />
                  <span className="flex-1 leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {decision.evidenceSnippets && decision.evidenceSnippets.length > 0 && (
          <Section
            icon={Link2}
            iconWrap="bg-primary/12 text-primary"
            title="References & trusted reading"
            delay={280}
          >
            <p className="mb-2 text-[11px] leading-relaxed text-muted-foreground">
              Context from our educational catalog and NIH MedlinePlus search
              links. This supports transparency — it is{" "}
              <span className="font-medium text-foreground/80">not</span>{" "}
              proof of a diagnosis or a clinical evidence grade.
            </p>
            <ul className="space-y-3 text-sm">
              {decision.evidenceSnippets.map((ev, i) => (
                <li
                  key={`${ev.title}-${i}`}
                  className="rounded-lg border border-line/60 bg-muted/25 px-3 py-2.5"
                >
                  <p className="font-medium text-foreground">{ev.title}</p>
                  <p className="mt-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
                    {ev.source}
                  </p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-foreground/90">
                    {ev.snippet}
                  </p>
                  {ev.url ? (
                    <a
                      href={ev.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      Open resource
                      <ExternalLink className="size-3" aria-hidden />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <p className="border-t border-line/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">
          {decision.disclaimer}
        </p>
      </div>
    </div>
  );
}
