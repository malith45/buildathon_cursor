export default function DisclaimerBanner() {
  return (
    <div
      role="note"
      className="rounded-xl border border-lavender/40 bg-lavender/15 px-4 py-3 text-sm leading-relaxed text-ink"
      style={{ borderLeft: "4px solid #b7a6ff" }}
    >
      <strong className="font-semibold text-ink">Not medical advice.</strong>{" "}
      This tool does not replace a doctor. If you think it is an emergency, call
      your local emergency number immediately.
    </div>
  );
}
