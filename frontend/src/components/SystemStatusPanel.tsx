"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchSystemHealth, type SystemHealth } from "@/lib/apiClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { errorMessage, toast } from "@/lib/toast";

type RowState = "loading" | "ok" | "warn" | "error";

function dotClass(state: RowState) {
  return cn(
    "size-2 shrink-0 rounded-full",
    state === "loading" && "animate-pulse bg-muted-foreground/40",
    state === "ok" && "bg-mint",
    state === "warn" && "bg-amber-500",
    state === "error" && "bg-coral"
  );
}

function rowBadgeClass(state: RowState) {
  return cn(
    "gap-2 px-3 py-1.5 font-normal",
    state === "ok" && "border-mint/40 bg-mint/10",
    state === "warn" && "border-amber-500/40 bg-amber-500/10",
    state === "error" && "border-coral/40 bg-coral/10",
    state === "loading" && "border-line/60"
  );
}

function isLegacyHealth(health: SystemHealth | null): boolean {
  if (!health) return false;
  return !("databaseConfigured" in health);
}

export default function SystemStatusPanel() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [probingGemini, setProbingGemini] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options?: { probe?: boolean; notify?: boolean }) => {
    const probe = options?.probe ?? false;
    const notify = options?.notify ?? false;
    setLoading(true);
    setProbingGemini(probe);
    setError(null);
    try {
      const data = await fetchSystemHealth(probe);
      setHealth(data);
      if (notify) {
        const legacy = !("databaseConfigured" in data);
        const ok =
          !legacy &&
          data.databaseConnected &&
          data.gemini?.working === true;
        if (ok) {
          toast.success("Systems check passed", "API, database, and Gemini are OK.");
        } else {
          toast.warning(
            "Systems check incomplete",
            legacy
              ? "Restart the backend (npm run dev in backend/)."
              : (data.gemini?.message ??
                  data.databaseMessage ??
                  "See status badges for details.")
          );
        }
      }
    } catch (e) {
      setHealth(null);
      const msg = errorMessage(e, "Could not reach the API server");
      setError(msg);
      if (notify) {
        toast.error("API unreachable", msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh({ probe: false });
  }, [refresh]);

  const legacyApi = isLegacyHealth(health);

  const apiState: RowState = loading
    ? "loading"
    : error
      ? "error"
      : legacyApi
        ? "warn"
        : "ok";

  const dbConfigured =
    health?.databaseConfigured ?? (legacyApi ? false : true);
  const dbConnected = health?.databaseConnected === true;

  const dbState: RowState = loading
    ? "loading"
    : !health
      ? "error"
      : legacyApi
        ? "warn"
        : !dbConfigured
          ? "warn"
          : dbConnected
            ? "ok"
            : "error";

  const geminiState: RowState = loading
    ? "loading"
    : legacyApi
      ? "warn"
      : !health?.gemini
        ? health?.geminiConfigured
          ? "warn"
          : "error"
        : !health.gemini.configured
          ? "error"
          : health.gemini.working
            ? "ok"
            : "error";

  const dbLabel = loading
    ? "Database…"
    : legacyApi
      ? "Database: restart API"
      : !dbConfigured
        ? "Database not configured"
        : dbConnected
          ? "Database connected"
          : "Database unavailable";

  const geminiLabel = loading
    ? probingGemini
      ? "Testing Gemini…"
      : "Checking…"
    : legacyApi
      ? "Gemini: restart API"
      : !health?.gemini
        ? health?.geminiConfigured
          ? "Gemini: configured"
          : "Gemini: not configured"
        : health.gemini.working
          ? `Gemini: ${health.gemini.model ?? "OK"}`
          : "Gemini: not working";

  const detailLines: string[] = [];
  if (legacyApi) {
    detailLines.push(
      "Backend is running old code. Stop it and run: cd backend && npm run dev"
    );
  }
  if (health?.databaseMessage && !dbConnected) {
    detailLines.push(health.databaseMessage);
  }
  if (health?.gemini?.message) {
    detailLines.push(health.gemini.message);
    if (health.gemini.working && health.gemini.sample) {
      detailLines.push(`Sample response: “${health.gemini.sample}”`);
    }
  } else if (health?.geminiConfigured && !health?.gemini && !legacyApi) {
    detailLines.push(
      "Gemini not tested on load (saves quota). Use “Test Gemini” when needed."
    );
  }
  if (error) {
    detailLines.push(error);
  }

  return (
    <section className="flex flex-col gap-2 sm:items-end">
      <section className="flex flex-wrap items-center justify-end gap-2">
        <Badge variant="outline" className={rowBadgeClass(apiState)}>
          <span className={dotClass(apiState)} aria-hidden />
          {loading
            ? "API…"
            : error
              ? "API offline"
              : legacyApi
                ? "API outdated"
                : "API online"}
        </Badge>

        <Badge variant="outline" className={rowBadgeClass(dbState)}>
          <span className={dotClass(dbState)} aria-hidden />
          {dbLabel}
        </Badge>

        <Badge variant="outline" className={rowBadgeClass(geminiState)}>
          <span className={dotClass(geminiState)} aria-hidden />
          {geminiLabel}
        </Badge>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-muted-foreground"
          title="Calls Gemini once (uses API quota)"
          onClick={() => void refresh({ probe: true, notify: true })}
          disabled={loading}
        >
          {loading ? "Checking…" : "Test Gemini"}
        </Button>
      </section>

      {!loading && detailLines.length > 0 && (
        <p
          className={cn(
            "max-w-md text-right text-xs leading-relaxed",
            geminiState === "error" || dbState === "error"
              ? "text-coral"
              : "text-muted-foreground"
          )}
        >
          {detailLines.join(" · ")}
        </p>
      )}
    </section>
  );
}
