"use client";

import { useEffect, useState } from "react";
import { dismissOnboarding, isOnboardingDismissed } from "@/lib/onboarding";
import BrandLogo from "@/components/BrandLogo";
import { APP_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

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
    <Modal
      open={open}
      onOpenChange={(v) => !v && close()}
      size="sm"
      ariaLabelledBy="onboarding-title"
    >
      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <div className="mb-3 flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
          <BrandLogo size="lg" showName={false} className="sm:self-start" />
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
