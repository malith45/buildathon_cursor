"use client";

import {
  HealthDecisionResponse,
  URGENCY_LABELS,
  UrgencyLevel,
} from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AlertOctagon,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Clock,
  HeartPulse,
  Info,
  Siren,
  Sparkles,
  Stethoscope,
  ShieldAlert,
} from "lucide-react";
import { ComponentType, SVGProps } from "react";

interface UrgencyStyle {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  banner: string;
  iconWrap: string;
  badge: string;
  ring: string;
  description: string;
}

const URGENCY_STYLES: Record<UrgencyLevel, UrgencyStyle> = {
  self_care: {
    label: URGENCY_LABELS.self_care,
    icon: CheckCircle2,
    banner: "bg-linear-to-br from-mint/20 via-mint/10 to-secondary",
    iconWrap: "bg-mint/25 text-mint",
    badge: "bg-mint/15 text-mint border-mint/30",
    ring: "ring-mint/25",
    description: "Symptoms can usually be managed at home.",
  },
  see_doctor_soon: {
    label: URGENCY_LABELS.see_doctor_soon,
    icon: Clock,
    banner: "bg-linear-to-br from-lavender/25 via-lavender/10 to-accent",
    iconWrap: "bg-lavender/30 text-lavender",
    badge: "bg-lavender/20 text-lavender border-lavender/40",
    ring: "ring-lavender/30",
    description: "Plan a clinic visit in the next few days.",
  },
  urgent_care: {
    label: URGENCY_LABELS.urgent_care,
    icon: ShieldAlert,
    banner: "bg-linear-to-br from-primary/25 via-primary/10 to-accent",
    iconWrap: "bg-primary/25 text-primary",
    badge: "bg-primary/15 text-primary border-primary/30",
    ring: "ring-primary/30",
    description: "Seek care today — same-day clinic or urgent care.",
  },
  emergency: {
    label: URGENCY_LABELS.emergency,
    icon: Siren,
    banner: "bg-linear-to-br from-coral/30 via-coral/15 to-coral/5",
    iconWrap: "bg-coral/25 text-coral",
    badge: "bg-coral/20 text-coral border-coral/40",
    ring: "ring-coral/40",
    description: "Call emergency services immediately.",
  },
};

interface Props {
  decision: HealthDecisionResponse | null;
  loading?: boolean;
}

function LoadingSkeleton() {
  return (
    <Card className="overflow-hidden shadow-(--shadow-card)">
      <div className="space-y-3 bg-linear-to-br from-primary/10 to-mint/10 p-5">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <CardContent className="space-y-3 pt-4">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
        <div className="flex items-center gap-2 pt-2">
          <Sparkles className="size-3.5 animate-pulse text-primary" />
          <p className="text-xs text-muted-foreground">
            Analyzing your symptoms with OpenAI…
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="flex h-full min-h-[280px] flex-col items-center justify-center overflow-hidden border-dashed bg-linear-to-br from-card via-card to-muted/40 text-center">
      <CardContent className="flex flex-col items-center py-12 px-6">
        <div className="relative mb-4">
          <div className="absolute inset-0 animate-ping rounded-2xl bg-primary/20 opacity-40" />
          <div className="relative flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-primary/15 to-mint/15 text-primary ring-1 ring-primary/20">
            <Stethoscope className="size-6" />
          </div>
        </div>
        <p className="font-heading text-sm font-semibold">
          Care decision will appear here
        </p>
        <p className="mt-1.5 max-w-[240px] text-xs leading-relaxed text-muted-foreground">
          Describe your symptoms in the chat to get urgency level, care steps,
          and education.
        </p>
      </CardContent>
    </Card>
  );
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
      className="animate-fade-up space-y-2"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "flex size-7 items-center justify-center rounded-lg",
            iconWrap
          )}
        >
          <Icon className="size-3.5" />
        </div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      </div>
      <div className="pl-9">{children}</div>
    </div>
  );
}

export default function TriageCard({ decision, loading }: Props) {
  if (loading && !decision) return <LoadingSkeleton />;
  if (!decision) return <EmptyState />;

  const style = URGENCY_STYLES[decision.urgency];
  const Icon = style.icon;

  return (
    <Card
      key={decision.urgency + decision.summary.slice(0, 20)}
      className={cn(
        "animate-fade-up overflow-hidden border-line/70 shadow-(--shadow-card) ring-1",
        style.ring
      )}
    >
      <div className={cn("relative px-5 py-5", style.banner)}>
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-white/30",
              style.iconWrap
            )}
          >
            <Icon className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-wider text-foreground/70">
              Recommendation
            </p>
            <h2 className="font-heading text-lg font-bold leading-tight text-foreground">
              {style.label}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-foreground/75">
              {style.description}
            </p>
          </div>
        </div>
      </div>

      <CardContent className="space-y-5 py-5">
        {decision.fallback && (
          <div className="animate-fade-in flex gap-2 rounded-lg border border-amber-300/50 bg-amber-50/60 p-3 text-xs leading-relaxed">
            <Info className="mt-0.5 size-3.5 shrink-0 text-amber-700" />
            <div>
              <p className="font-semibold text-amber-900">Fallback response</p>
              <p className="mt-0.5 text-amber-800">
                We used safe fallback guidance. Please consult a clinician.
              </p>
            </div>
          </div>
        )}

        {decision.urgency === "emergency" && (
          <div className="animate-fade-in flex gap-2 rounded-lg border border-coral/40 bg-coral/10 p-3 text-xs leading-relaxed">
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
            title="Red flags"
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
            title="Care steps"
            delay={190}
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
            title="Education"
            delay={260}
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

        <p className="border-t border-line/60 pt-3 text-[11px] leading-relaxed text-muted-foreground">
          {decision.disclaimer}
        </p>
      </CardContent>
    </Card>
  );
}
