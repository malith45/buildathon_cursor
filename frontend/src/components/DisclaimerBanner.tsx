import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function DisclaimerBanner() {
  return (
    <Alert
      className="border-lavender/50 bg-lavender/15"
      style={{ borderLeft: "4px solid #b7a6ff" }}
    >
      <AlertCircle className="text-lavender" />
      <AlertTitle>Not medical advice</AlertTitle>
      <AlertDescription>
        This tool does not replace a doctor. If you think it is an emergency,
        call your local emergency number immediately.
      </AlertDescription>
    </Alert>
  );
}
