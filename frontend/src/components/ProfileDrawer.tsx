"use client";

import { useEffect, useRef } from "react";
import HealthProfileForm from "@/components/HealthProfileForm";
import { HealthProfile } from "@/lib/types";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useSafeNavigate } from "@/lib/navigation";
import { markProfileFromHeader } from "@/lib/profile-nav";
import { Button } from "@/components/ui/button";
import { Sliders, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: HealthProfile;
  onChange: (profile: HealthProfile) => void;
}

export default function ProfileDrawer({
  open,
  onOpenChange,
  profile,
  onChange,
}: Props) {
  const panelRef = useRef<HTMLElement>(null);
  const navigate = useSafeNavigate();
  useFocusTrap(panelRef, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange]);

  function openAccountSettings() {
    onOpenChange(false);
    markProfileFromHeader();
    navigate("/profile");
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => onOpenChange(false)}
        aria-hidden
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Health profile"
        aria-hidden={!open}
        inert={!open ? true : undefined}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background shadow-2xl transition-transform duration-300 ease-out sm:max-w-sm ${
          open ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
      >
        <div className="flex items-center justify-between border-b border-line/60 bg-card px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sliders className="size-4" />
            </div>
            <div>
              <p className="font-heading text-sm font-semibold leading-tight">
                Health profile
              </p>
              <p className="text-[11px] text-muted-foreground">
                Personalizes your guidance
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => onOpenChange(false)}
            aria-label="Close profile"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="scrollbar-thin flex-1 overflow-y-auto p-5">
          <HealthProfileForm
            profile={profile}
            onChange={onChange}
            embedded
          />
        </div>

        <div className="flex flex-col gap-2 border-t border-line/60 bg-card px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={openAccountSettings}
          >
            Account settings
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Health changes save automatically.
          </p>
        </div>
      </aside>
    </>
  );
}
