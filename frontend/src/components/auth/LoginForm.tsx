"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRedirectIfAuthenticated } from "@/hooks/useRedirectIfAuthenticated";
import { useStripSensitiveQueryParams } from "@/hooks/useStripSensitiveQueryParams";
import { authRedirect } from "@/lib/auth-redirect";
import { Button } from "@/components/ui/button";
import { errorMessage, toast } from "@/lib/toast";
import AuthPanel from "@/components/auth/AuthPanel";
import { IconInput, PasswordInput } from "@/components/auth/AuthFields";
import { Loader2, Lock, Mail } from "lucide-react";

export default function LoginForm() {
  const { login } = useAuth();
  useRedirectIfAuthenticated("/");
  useStripSensitiveQueryParams();
  const emailRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-focus email on mount for an instant typing experience
    emailRef.current?.focus();
  }, []);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setFormError(null);
    setSubmitting(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");

    try {
      await login(email, password);
      toast.success("Welcome back", "Signed in successfully.");
      authRedirect("/");
    } catch (err) {
      const msg = errorMessage(err, "Invalid email or password.");
      setFormError(msg);
      toast.error("Couldn't sign you in", msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthPanel
      title="Welcome back"
      subtitle="Sign in to save your health profile and chat history."
      footer={
        <p className="text-center text-xs text-muted-foreground">
          New here?{" "}
          <Link
            href="/signup"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
      }
    >
      <form
        onSubmit={handleSubmit}
        method="post"
        action="/login"
        noValidate
        className="space-y-4"
      >
        <IconInput
          ref={emailRef}
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
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          minLength={8}
          icon={Lock}
          label="Password"
          placeholder="Your password"
          disabled={submitting}
        />

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
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthPanel>
  );
}
