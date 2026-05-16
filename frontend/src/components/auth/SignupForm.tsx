"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSafeNavigate } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { errorMessage, toast } from "@/lib/toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { APP_NAME } from "@/lib/brand";
import { Loader2 } from "lucide-react";

export default function SignupForm() {
  const navigate = useSafeNavigate();
  const { signup } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "");
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    try {
      await signup(email, password, name);
      toast.success("Account created", "Complete your health profile next.");
      navigate("/profile");
    } catch (err) {
      toast.error("Sign up failed", errorMessage(err, "Could not create account"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="w-full max-w-md shadow-(--shadow-card)">
      <CardHeader>
        <CardTitle className="font-heading text-xl">Create account</CardTitle>
        <CardDescription>
          Join {APP_NAME} to save your health profile across devices.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4 pb-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              required
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              placeholder="At least 8 characters"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 border-t bg-muted/30 pt-6">
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting && <Loader2 className="size-4 animate-spin" />}
            Create account
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Log in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
