"use client";

import { ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
  size?: "sm" | "md";
  className?: string;
  /** When false, clicking the backdrop won't close the modal. Default: true. */
  closeOnBackdrop?: boolean;
}

/**
 * Lightweight centered modal — matches the visual language used by ProfileDrawer
 * (backdrop + card-style surface) but anchored to the viewport center instead
 * of sliding from the right. Used for confirmations and short success prompts.
 */
export function Modal({
  open,
  onOpenChange,
  children,
  size = "sm",
  className,
  closeOnBackdrop = true,
}: ModalProps) {
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

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center px-4 transition-opacity duration-200",
        open ? "opacity-100" : "pointer-events-none opacity-0"
      )}
      aria-hidden={!open}
    >
      <div
        className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
        onClick={() => closeOnBackdrop && onOpenChange(false)}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "animate-fade-up relative w-full rounded-2xl border border-line/70 bg-card shadow-2xl",
          size === "sm" ? "max-w-sm" : "max-w-md",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}
