"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import HealthProfileForm from "@/components/HealthProfileForm";
import { useAuth } from "@/contexts/AuthContext";
import { DEFAULT_PROFILE, type HealthProfile } from "@/lib/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle2 } from "lucide-react";

function ProfileContent() {
  const { user, updateName, updateHealthProfile } = useAuth();
  const [name, setName] = useState("");
  const [healthProfile, setHealthProfile] =
    useState<HealthProfile>(DEFAULT_PROFILE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setHealthProfile(user.healthProfile);
    }
  }, [user]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      if (name.trim() !== user.name) {
        await updateName(name.trim());
      }
      await updateHealthProfile(healthProfile);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          Your profile
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and health context used for triage guidance.
        </p>
      </div>

      <Card className="shadow-[var(--shadow-card)]">
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Basic account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Display name</Label>
            <Input
              id="profile-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">Email</Label>
            <Input
              id="profile-email"
              value={user.email}
              disabled
              className="bg-muted/50"
            />
            <p className="text-xs text-muted-foreground">
              Email cannot be changed in this demo.
            </p>
          </div>
        </CardContent>
      </Card>

      <HealthProfileForm
        embedded
        profile={healthProfile}
        onChange={setHealthProfile}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {saved && (
        <Alert className="border-mint/40 bg-mint/10">
          <CheckCircle2 className="text-mint" />
          <AlertDescription>Profile saved successfully.</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving && <Loader2 className="size-4 animate-spin" />}
          Save profile
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Back to consult
        </Link>
      </div>

      <Separator />

      <p className="text-xs text-muted-foreground">
        Member since {new Date(user.createdAt).toLocaleDateString()}
      </p>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
