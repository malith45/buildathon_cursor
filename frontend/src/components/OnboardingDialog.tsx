"use client";

import { useEffect, useState } from "react";
import { dismissOnboarding, isOnboardingDismissed } from "@/lib/onboarding";
import { APP_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Sparkles } from "lucide-react";

export default function OnboardingDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isOnboardingDismissed()) setOpen(true);
  }, []);

  function close() {
    dismissOnboarding();
    setOpen(false);
  }

  return (
    <Modal open={open} onOpenChange={(v) => !v && close()} size="sm">
      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <div className="mb-3 flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="size-4" aria-hidden />
          </span>
          <h2
            id="onboarding-title"
            className="font-heading text-base font-semibold leading-tight"
          >
            Welcome to {APP_NAME}
          </h2>
        </div>
        <p className="text-sm leading-snug text-muted-foreground">
          Describe symptoms for educational guidance — not a diagnosis or
          prescription.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          <span className="font-medium text-foreground/90">Emergency?</span> Call
          your local emergency number.
        </p>
        <Button type="button" className="mt-4 w-full" size="sm" onClick={close}>
          Continue
        </Button>
      </div>
    </Modal>
  );
}
