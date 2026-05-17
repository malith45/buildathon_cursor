"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRedirectIfAuthenticated } from "@/hooks/useRedirectIfAuthenticated";
import { useStripSensitiveQueryParams } from "@/hooks/useStripSensitiveQueryParams";
import { authRedirect } from "@/lib/auth-redirect";
import { Button } from "@/components/ui/button";
import { errorMessage, toast } from "@/lib/toast";
import AuthPanel from "@/components/auth/AuthPanel";
import { IconInput, PasswordInput } from "@/components/auth/AuthFields";
import { cn } from "@/lib/utils";
import { Loader2, Lock, Mail, User } from "lucide-react";

interface StrengthInfo {
  score: 0 | 1 | 2 | 3 | 4;
  label: string;
  tone: string;
}

function scorePassword(pw: string): StrengthInfo {
  if (!pw) return { score: 0, label: "", tone: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const clamped = Math.min(score, 4) as StrengthInfo["score"];
  const meta: Record<StrengthInfo["score"], { label: string; tone: string }> = {
    0: { label: "", tone: "" },
    1: { label: "Weak", tone: "text-destructive" },
    2: { label: "Fair", tone: "text-amber-600 dark:text-amber-400" },
    3: { label: "Good", tone: "text-mint" },
    4: { label: "Strong", tone: "text-mint" },
  };
  return { score: clamped, label: meta[clamped].label, tone: meta[clamped].tone };
}

const BAR_BG: Record<StrengthInfo["score"], string> = {
  0: "bg-muted",
  1: "bg-destructive/70",
  2: "bg-amber-500/80",
  3: "bg-mint/70",
  4: "bg-mint",
};

export default function SignupForm() {
  const { signup } = useAuth();
  useRedirectIfAuthenticated("/");
  useStripSensitiveQueryParams();
  const nameRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [password, setPassword] = useState("");

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const strength = useMemo(() => scorePassword(password), [password]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const pw = String(form.get("password") ?? "");

    try {
      await signup(email, pw, name);
      toast.success("Account created", "Let's complete your health profile.");
      authRedirect("/profile");
    } catch (err) {
      const msg = errorMessage(err, "Couldn't create your account.");
      setFormError(msg);
      toast.error("Sign up failed", msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPanel
      title="Create your account"
      subtitle="A 30-second signup to sync your profile and chat history."
      footer={
        <p className="text-center text-xs text-muted-foreground">
          Already a member?{" "}
          <Link
            href="/login"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      }
    >
      <form
        onSubmit={handleSubmit}
        method="post"
        action="/signup"
        noValidate
        className="space-y-4"
      >
        <IconInput
          ref={nameRef}
          id="name"
          name="name"
          autoComplete="name"
          required
          icon={User}
          label="Full name"
          placeholder="Jane Doe"
          disabled={submitting}
        />
        <IconInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          icon={Mail}
          label="Email"
          placeholder="you@example.com"
          disabled={submitting}
        />
        <div className="space-y-1.5">
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            minLength={8}
            icon={Lock}
            label="Password"
            placeholder="At least 8 characters"
            disabled={submitting}
            hint={password ? undefined : "8+ characters · mix letters, numbers, symbols for best strength"}
            onChange={(e) => setPassword(e.currentTarget.value)}
          />
          {password && (
            <div className="flex items-center gap-2 pt-0.5">
              <div className="flex flex-1 items-center gap-1">
                {[1, 2, 3, 4].map((tier) => (
                  <span
                    key={tier}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      strength.score >= tier
                        ? BAR_BG[strength.score]
                        : "bg-muted"
                    )}
                  />
                ))}
              </div>
              <span
                className={cn(
                  "min-w-[42px] text-right text-[11px] font-medium",
                  strength.tone
                )}
              >
                {strength.label}
              </span>
            </div>
          )}
        </div>

        {formError && (
          <div
            role="alert"
            className="animate-fade-in rounded-lg border border-destructive/30 bg-destructive/8 px-3 py-2 text-xs leading-relaxed text-destructive"
          >
            {formError}
          </div>
        )}

        <Button
          type="submit"
          className="h-10 w-full text-sm font-medium"
          disabled={submitting}
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {submitting ? "Creating account…" : "Create account"}
        </Button>

        <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
          By signing up, you agree this tool provides educational guidance only
          and is not a substitute for medical advice.
        </p>
      </form>
    </AuthPanel>
  );
}
