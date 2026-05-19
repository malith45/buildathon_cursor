"use client";

import MessageSpeakToolbar from "@/components/MessageSpeakToolbar";
import { decisionToSpeechText } from "@/lib/decision-speech";
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
import { Button } from "@/components/ui/button";

interface UrgencyStyle {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  banner: string;
  iconWrap: string;
  description: string;
}

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
  showLeadDisclaimer?: boolean;
  onRequestFreshGuidance?: () => void;
}

function EmergencyStickyBar() {
  return (
    <div
      className="sticky top-0 z-10 border-b-2 border-coral bg-coral px-3 py-2.5 text-white shadow-md sm:px-4 sm:py-3"
      role="alert"
    >
      <p className="text-center text-xs font-bold tracking-wide sm:text-sm">
        Call emergency services now if this feels life-threatening
      </p>
      <p className="mt-1 text-center text-[10px] opacity-90 sm:text-xs">
        In the U.S. call <strong>911</strong> · U.K. <strong>999</strong> · EU{" "}
        <strong>112</strong>
      </p>
    </div>
  );
}

function SourcesJumpLink({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <p className="mb-3">
      <a
        href="#guidance-references"
        className="text-sm font-medium text-primary underline-offset-2 hover:underline"
      >
        Sources ({count}) — jump to references
      </a>
    </p>
  );
}

function Section({
  icon: Icon,
  title,
  iconWrap,
  delay,
  simpleView,
  children,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  title: string;
  iconWrap: string;
  delay: number;
  simpleView?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "space-y-1.5",
        !simpleView && "animate-fade-up"
      )}
      style={simpleView ? undefined : { animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex items-center justify-center rounded-md",
            simpleView ? "size-8" : "size-6",
            iconWrap
          )}
        >
          <Icon className={simpleView ? "size-4" : "size-3.5"} />
        </div>
        <h4
          className={cn(
            "font-semibold uppercase tracking-wider text-muted-foreground",
            simpleView ? "text-xs" : "text-[11px]"
          )}
        >
          {title}
        </h4>
      </div>
      <div className={simpleView ? "pl-0 sm:pl-10" : "pl-8"}>{children}</div>
    </div>
  );
}

function CollapsibleSection({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details
      className="rounded-lg border-2 border-border bg-muted/20 px-3 py-2"
      open={defaultOpen}
    >
      <summary className="cursor-pointer list-none text-sm font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        <span className="underline decoration-muted-foreground/50 underline-offset-2">
          {title}
        </span>
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          (tap to expand)
        </span>
      </summary>
      <div className="mt-3 space-y-2 border-t border-border pt-3">{children}</div>
    </details>
  );
}

function UrgencyBanner({
  style,
  urgency,
  simpleView,
}: {
  style: UrgencyStyle;
  urgency: UrgencyLevel;
  simpleView: boolean;
}) {
  const Icon = style.icon;
  const showRec = showRecommendationBanner(urgency);

  if (!showRec && !simpleView) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-3 border-b border-line/60 px-4 py-3.5",
        simpleView
          ? "border-b-2 border-foreground/20 bg-muted/40"
          : style.banner
      )}
    >
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-white/30",
          simpleView ? "size-12" : "size-10",
          style.iconWrap
        )}
      >
        <Icon className={simpleView ? "size-6" : "size-5"} />
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "font-medium uppercase tracking-wider text-foreground/70",
            simpleView ? "text-xs" : "text-[10px]"
          )}
        >
          {showRec ? "Recommendation" : "Urgency level"}
        </p>
        <h3
          className={cn(
            "font-heading font-bold leading-tight text-foreground",
            simpleView ? "text-xl" : "text-base"
          )}
        >
          {style.label}
        </h3>
        <p
          className={cn(
            "mt-0.5 leading-relaxed text-foreground/80",
            simpleView ? "text-sm" : "text-xs"
          )}
        >
          {style.description}
        </p>
      </div>
    </div>
  );
}

function AlertBlocks({
  decision,
  simpleView,
}: {
  decision: HealthDecisionResponse;
  simpleView: boolean;
}) {
  const textSize = simpleView ? "text-sm" : "text-xs";

  return (
    <>
      {decision.safetyEscalation && decision.safetyNote && (
        <div
          className={cn(
            "flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 leading-relaxed dark:border-amber-500/35 dark:bg-amber-500/15",
            simpleView && "border-2 p-3",
            textSize,
            !simpleView && "animate-fade-in"
          )}
        >
          <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">
              Extra safety check
            </p>
            <p className="mt-0.5 text-foreground/90">{decision.safetyNote}</p>
          </div>
        </div>
      )}

      {decision.fallback && (
        <div
          className={cn(
            "flex gap-2 rounded-lg border border-amber-300/50 bg-amber-50/60 p-2.5 leading-relaxed dark:border-amber-500/30 dark:bg-amber-500/10",
            simpleView && "border-2 p-3",
            textSize,
            !simpleView && "animate-fade-in"
          )}
        >
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
        <div
          className={cn(
            "flex gap-2 rounded-lg border border-coral/40 bg-coral/10 p-2.5 leading-relaxed",
            simpleView && "border-2 border-coral p-3",
            textSize,
            !simpleView && "animate-fade-in"
          )}
          role="alert"
        >
          <AlertOctagon className="mt-0.5 size-4 shrink-0 text-coral" />
          <div>
            <p className="font-semibold text-coral">Call emergency services</p>
            <p className="mt-0.5 text-foreground/80">
              If this feels life-threatening, call your local emergency number
              now.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

function EducationList({ items, simpleView }: { items: string[]; simpleView: boolean }) {
  return (
    <ul className={cn("space-y-1.5", simpleView ? "text-base" : "text-sm")}>
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-foreground/85">
          <span className="mt-2 size-1.5 shrink-0 rounded-full bg-lavender" />
          <span className="flex-1 leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function EvidenceList({
  snippets,
  simpleView,
}: {
  snippets: NonNullable<HealthDecisionResponse["evidenceSnippets"]>;
  simpleView: boolean;
}) {
  return (
    <>
      <p
        className={cn(
          "mb-2 leading-relaxed text-muted-foreground",
          simpleView ? "text-sm" : "text-[11px]"
        )}
      >
        Context from our educational catalog and NIH MedlinePlus search links.
        This supports transparency — it is{" "}
        <span className="font-medium text-foreground/80">not</span> proof of a
        diagnosis or a clinical evidence grade.
      </p>
      <ul className={cn("space-y-3", simpleView ? "text-base" : "text-sm")}>
        {snippets.map((ev, i) => (
          <li
            key={`${ev.title}-${i}`}
            className="rounded-lg border border-line/60 bg-muted/25 px-3 py-2.5"
          >
            <p className="font-medium text-foreground">{ev.title}</p>
            <p className="mt-0.5 text-[10px] font-medium tracking-wide text-muted-foreground">
              {ev.source}
            </p>
            <p className="mt-1.5 leading-relaxed text-foreground/90">
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
    </>
  );
}

function FallbackActions({
  onRequestFreshGuidance,
}: {
  onRequestFreshGuidance?: () => void;
}) {
  if (!onRequestFreshGuidance) return null;
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="mt-2"
      onClick={onRequestFreshGuidance}
    >
      Try again
    </Button>
  );
}

export default function DecisionMessage({
  decision,
  showLeadDisclaimer = false,
  onRequestFreshGuidance,
}: Props) {
  const style = URGENCY_STYLES[decision.urgency];
  const showRec = showRecommendationBanner(decision.urgency);
  const evidence = decision.evidenceSnippets ?? [];
  const speechText = decisionToSpeechText(decision);
  const Icon = style.icon;

  return (
    <article
      className="flex w-full flex-col overflow-hidden rounded-2xl rounded-tl-sm border border-line/60 bg-card shadow-sm animate-fade-up"
      aria-label="Health guidance"
    >
      <MessageSpeakToolbar
        text={speechText}
        className="bg-muted/25"
      />
      {decision.urgency === "emergency" && <EmergencyStickyBar />}
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

      <div className="space-y-4 px-3 py-3 sm:px-4 sm:py-4">
        <AlertBlocks decision={decision} simpleView={false} />
        {decision.fallback && (
          <FallbackActions onRequestFreshGuidance={onRequestFreshGuidance} />
        )}
        <SourcesJumpLink count={evidence.length} />

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
            <EducationList items={decision.education} simpleView={false} />
          </Section>
        )}

        {evidence.length > 0 && (
          <section id="guidance-references" className="scroll-mt-4">
            <Section
              icon={Link2}
              iconWrap="bg-primary/12 text-primary"
              title="References & trusted reading"
              delay={280}
            >
              <EvidenceList snippets={evidence} simpleView={false} />
            </Section>
          </section>
        )}

        <p className="border-t border-line/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">
          {decision.disclaimer}
        </p>
      </div>
    </article>
  );
}
