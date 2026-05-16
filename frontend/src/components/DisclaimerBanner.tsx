import { ShieldAlert } from "lucide-react";

export default function DisclaimerBanner() {
  return (
    <div className="animate-fade-in flex items-start gap-2.5 rounded-xl border border-lavender/40 bg-lavender/10 px-4 py-2.5">
      <ShieldAlert className="mt-0.5 size-4 shrink-0 text-lavender" />
      <p className="text-xs leading-relaxed text-foreground/80">
        <span className="font-semibold text-foreground">Not medical advice.</span>{" "}
        This tool does not replace a clinician. In an emergency, call your
        local emergency number immediately.
      </p>
    </div>
  );
}
