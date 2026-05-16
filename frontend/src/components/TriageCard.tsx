"use client";

import {
  HealthDecisionResponse,
  URGENCY_LABELS,
  UrgencyLevel,
} from "@/lib/types";
import { sectionSubtitle, sectionTitle } from "@/lib/ui";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

const URGENCY_VARIANT: Record<
  UrgencyLevel,
  "default" | "secondary" | "outline" | "destructive"
> = {
  self_care: "secondary",
  see_doctor_soon: "outline",
  urgent_care: "default",
  emergency: "destructive",
};

const URGENCY_CLASS: Record<UrgencyLevel, string> = {
  self_care: "border-mint/50 bg-mint/15 text-foreground hover:bg-mint/15",
  see_doctor_soon:
    "border-lavender/50 bg-lavender/20 text-foreground hover:bg-lavender/20",
  urgent_care: "bg-primary/90",
  emergency: "bg-destructive/15 text-destructive hover:bg-destructive/15",
};

interface Props {
  decision: HealthDecisionResponse | null;
  loading?: boolean;
}

function LoadingSkeleton() {
  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardContent className="space-y-3 pt-6">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-4/6" />
        <p className="pt-2 text-sm text-muted-foreground">
          Analyzing your symptoms…
        </p>
      </CardContent>
    </Card>
  );
}

export default function TriageCard({ decision, loading }: Props) {
  if (loading && !decision) {
    return <LoadingSkeleton />;
  }

  if (!decision) {
    return (
      <Card className="flex min-h-[200px] flex-col items-center justify-center border-dashed bg-gradient-to-br from-card to-muted/50 text-center shadow-[var(--shadow-card)]">
        <CardContent className="flex flex-col items-center py-10">
          <div className="mb-3 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-6" />
          </div>
          <CardTitle className="text-sm">Care decision</CardTitle>
          <CardDescription className="mt-1 max-w-[200px]">
            Send a message to receive personalized triage guidance.
          </CardDescription>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-[var(--shadow-card)]">
      <CardHeader className="flex-row items-start justify-between gap-2 border-b">
        <div>
          <p className={sectionSubtitle}>Guidance</p>
          <CardTitle className={sectionTitle}>Care decision</CardTitle>
        </div>
        <Badge
          className={cn(
            "shrink-0 uppercase tracking-wide",
            URGENCY_CLASS[decision.urgency]
          )}
          variant={URGENCY_VARIANT[decision.urgency]}
        >
          {URGENCY_LABELS[decision.urgency]}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {decision.fallback && (
          <Alert>
            <AlertTitle>Fallback response</AlertTitle>
            <AlertDescription>
              We used a safe fallback response. Please consult a clinician.
            </AlertDescription>
          </Alert>
        )}

        {decision.urgency === "emergency" && (
          <Alert variant="destructive" className="border-coral/40 bg-coral/10">
            <AlertTitle>Emergency</AlertTitle>
            <AlertDescription>
              If this feels life-threatening, call emergency services now.
            </AlertDescription>
          </Alert>
        )}

        <p className="text-sm leading-relaxed">{decision.summary}</p>

        {decision.redFlags.length > 0 && (
          <Alert variant="destructive" className="border-coral/30 bg-coral/5">
            <AlertTitle className="text-destructive">Red flags</AlertTitle>
            <AlertDescription>
              <ul className="mt-2 space-y-1.5">
                {decision.redFlags.map((item, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="text-destructive">•</span>
                    {item}
                  </li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {decision.careSteps.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Suggested care steps
            </h3>
            <ul className="space-y-1.5 text-sm">
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
          <div className="rounded-xl bg-muted/60 p-3">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Education
            </h3>
            <ul className="space-y-1.5 text-sm">
              {decision.education.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="border-t pt-3 text-xs leading-relaxed text-muted-foreground">
          {decision.disclaimer}
        </p>
      </CardContent>
    </Card>
  );
}
