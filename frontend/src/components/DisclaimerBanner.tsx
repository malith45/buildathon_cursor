import { ShieldAlert } from "lucide-react";

export default function DisclaimerBanner() {
  return (
    <p className="animate-fade-in flex items-center justify-center gap-1.5 px-4 text-[11px] leading-relaxed text-muted-foreground">
      <ShieldAlert className="size-3 shrink-0 text-lavender" aria-hidden />
      <span>
        <span className="font-medium text-foreground/80">Not medical advice.</span>{" "}
        In an emergency, call your local emergency number.
      </span>
    </p>
  );
}
