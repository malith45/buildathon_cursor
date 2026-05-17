"use client";

import { useState } from "react";
import Link from "next/link";
import AuthGuard from "@/components/AuthGuard";
import HealthProfileForm from "@/components/HealthProfileForm";
import { useAuth } from "@/contexts/AuthContext";
import { useSafeNavigate } from "@/lib/navigation";
import { type HealthProfile, type User } from "@/lib/types";
import { errorMessage, toast } from "@/lib/toast";
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
import { Modal } from "@/components/ui/modal";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Loader2 } from "lucide-react";

function ProfileForm({
  user,
  updateName,
  updateHealthProfile,
}: {
  user: User;
  updateName: (name: string) => Promise<void>;
  updateHealthProfile: (profile: HealthProfile) => Promise<void>;
}) {
  const navigate = useSafeNavigate();
  const [name, setName] = useState(user.name);
  const [healthProfile, setHealthProfile] = useState<HealthProfile>(
    user.healthProfile
  );
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const updates: Promise<unknown>[] = [];
      if (name.trim() !== user.name) {
        updates.push(updateName(name.trim()));
      }
      updates.push(updateHealthProfile(healthProfile));
      // Issue both updates in parallel so the user waits on the slower
      // of the two, not the sum.
      await Promise.all(updates);
      setShowSuccess(true);
    } catch (err) {
      toast.error(
        "Couldn't save profile",
        errorMessage(err, "Please try again.")
      );
    } finally {
      setSaving(false);
    }
  }

  function continueToHome() {
    setShowSuccess(false);
    navigate("/");
  }

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

      <Card className="shadow-(--shadow-card)">
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

      <Card className="shadow-(--shadow-card)">
        <CardHeader className="border-b">
          <CardTitle>Health profile</CardTitle>
          <CardDescription>
            Used when you request care guidance on the consult screen.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <HealthProfileForm
            embedded
            profile={healthProfile}
            onChange={setHealthProfile}
          />
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving && <Loader2 className="size-4 animate-spin" />}
          {saving ? "Saving…" : "Save profile"}
        </Button>
        <Link href="/" className={buttonVariants({ variant: "outline", size: "lg" })}>
          Back to consult
        </Link>
      </div>

      <Separator />

      <p className="text-xs text-muted-foreground">
        Member since {new Date(user.createdAt).toLocaleDateString()}
      </p>

      <Modal
        open={showSuccess}
        onOpenChange={setShowSuccess}
        closeOnBackdrop={false}
      >
        <div className="px-6 pt-6 pb-2 text-center sm:px-7 sm:pt-7">
          <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-2xl bg-mint/15 text-mint ring-1 ring-mint/30">
            <CheckCircle2 className="size-6" />
          </div>
          <h2 className="font-heading text-lg font-semibold">All set!</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Your health profile is saved. We&apos;ll use it to tailor guidance
            the next time you describe symptoms.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 border-t border-line/60 bg-muted/30 px-6 py-3 sm:px-7">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowSuccess(false)}
          >
            Stay here
          </Button>
          <Button type="button" size="sm" onClick={continueToHome}>
            Continue to chat
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function ProfileContent() {
  const { user, updateName, updateHealthProfile } = useAuth();
  if (!user) return null;
  return (
    <ProfileForm
      key={user.id}
      user={user}
      updateName={updateName}
      updateHealthProfile={updateHealthProfile}
    />
  );
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}
