"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { isMisconfiguredApiUrl, getApiBaseUrl } from "@/lib/api-config";
import { fetchHealthStatus } from "@/lib/health-api";
import { AlertTriangle, CloudOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SystemBanners() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [storageIssue, setStorageIssue] = useState<string | null>(null);

  const apiMisconfigured = isMisconfiguredApiUrl();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void fetchHealthStatus()
      .then((h) => {
        if (cancelled) return;
        if (h.storageConfigured && !h.storageConnected) {
          setStorageIssue(
            h.storageMessage ??
              "Account features are unavailable until cloud storage is configured."
          );
        } else {
          setStorageIssue(null);
        }
      })
      .catch(() => {
        if (!cancelled) setStorageIssue(null);
      });
    }, 2500);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [user]);

  const effectiveStorageIssue = user ? storageIssue : null;

  const banners: { id: string; tone: "warn" | "info"; title: string; body: string }[] =
    [];

  if (apiMisconfigured && !dismissed.has("api")) {
    banners.push({
      id: "api",
      tone: "warn",
      title: "API not reachable from this site",
      body: `This app is calling ${getApiBaseUrl()}, which only works on your computer. Set NEXT_PUBLIC_API_URL to your deployed API URL and redeploy.`,
    });
  }

  if (effectiveStorageIssue && !dismissed.has("storage")) {
    banners.push({
      id: "storage",
      tone: "info",
      title: "Accounts & chat sync unavailable",
      body: `${effectiveStorageIssue} Symptom triage still works without signing in.`,
    });
  }

  if (banners.length === 0) return null;

  return (
    <div className="shrink-0 space-y-2 px-2 pt-2 sm:px-4 md:px-6 lg:px-8">
      {banners.map((b) => (
        <div
          key={b.id}
          role="status"
          className={
            b.tone === "warn"
              ? "flex gap-3 rounded-xl border-2 border-amber-500/50 bg-amber-500/10 px-4 py-3 text-sm"
              : "flex gap-3 rounded-xl border border-border bg-muted/50 px-4 py-3 text-sm"
          }
        >
          {b.tone === "warn" ? (
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
          ) : (
            <CloudOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          )}
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">{b.title}</p>
            <p className="mt-0.5 text-muted-foreground">{b.body}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="shrink-0"
            aria-label="Dismiss"
            onClick={() =>
              setDismissed((prev) => new Set(prev).add(b.id))
            }
          >
            <X className="size-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
