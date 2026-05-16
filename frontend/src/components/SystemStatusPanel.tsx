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
    "h-7 gap-1.5 px-2.5 text-xs font-normal",
    state === "ok" && "border-mint/40 bg-mint/10",
    state === "warn" && "border-amber-500/40 bg-amber-500/10",
    state === "error" && "border-coral/40 bg-coral/10",
    state === "loading" && "border-line/60"
  );
}

function isLegacyHealth(health: SystemHealth | null): boolean {
  if (!health) return false;
  return !("aiConfigured" in health);
}

export default function SystemStatusPanel() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [probingAi, setProbingAi] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (options?: { probe?: boolean; notify?: boolean }) => {
      const probe = options?.probe ?? false;
      const notify = options?.notify ?? false;
      setLoading(true);
      setProbingAi(probe);
      setError(null);
      try {
        const data = await fetchSystemHealth(probe);
        setHealth(data);
        if (notify) {
          const legacy = !("aiConfigured" in data);
          const ok =
            !legacy && data.storageConnected && data.ai?.working === true;
          if (ok) {
            toast.success(
              "Systems check passed",
              "API, GCS, and OpenAI are all responsive."
            );
          } else {
            toast.warning(
              "Systems check incomplete",
              legacy
                ? "Restart the backend (uvicorn app.main:app)."
                : (data.ai?.message ??
                    data.storageMessage ??
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
    },
    []
  );

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

  const storageConfigured = health?.storageConfigured ?? !legacyApi;
  const storageConnected = health?.storageConnected === true;

  const storageState: RowState = loading
    ? "loading"
    : !health
      ? "error"
      : legacyApi
        ? "warn"
        : !storageConfigured
          ? "warn"
          : storageConnected
            ? "ok"
            : "error";

  const aiState: RowState = loading
    ? "loading"
    : legacyApi
      ? "warn"
      : !health?.ai
        ? health?.aiConfigured
          ? "warn"
          : "error"
        : !health.ai.configured
          ? "error"
          : health.ai.working
            ? "ok"
            : "error";

  const storageLabel = loading
    ? "Storage…"
    : legacyApi
      ? "Storage: restart API"
      : !storageConfigured
        ? "GCS not configured"
        : storageConnected
          ? health?.storageBucket
            ? `GCS: ${health.storageBucket}`
            : "GCS connected"
          : "GCS unavailable";

  const aiLabel = loading
    ? probingAi
      ? "Testing OpenAI…"
      : "Checking…"
    : legacyApi
      ? "OpenAI: restart API"
      : !health?.ai
        ? health?.aiConfigured
          ? `OpenAI: ${health?.aiModel ?? "configured"}`
          : "OpenAI: not configured"
        : health.ai.working
          ? `OpenAI: ${health.ai.model ?? health?.aiModel ?? "OK"}`
          : "OpenAI: not working";

  const detailLines: string[] = [];
  if (legacyApi) {
    detailLines.push(
      "Backend is running old code. Restart with: cd backend && uvicorn app.main:app --reload --port 4000"
    );
  }
  if (health?.storageMessage && !storageConnected) {
    detailLines.push(health.storageMessage);
  }
  if (health?.ai?.message) {
    detailLines.push(health.ai.message);
    if (health.ai.working && health.ai.sample) {
      detailLines.push(`Sample response: "${health.ai.sample}"`);
    }
  } else if (health?.aiConfigured && !health?.ai && !legacyApi) {
    detailLines.push(
      "OpenAI not tested on load (saves a tiny bit of usage). Use \u201CTest OpenAI\u201D when needed."
    );
  }
  if (error) {
    detailLines.push(error);
  }

  return (
    <div className="flex flex-col items-stretch gap-2 sm:items-end">
      <div className="flex flex-wrap items-center justify-end gap-2">
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

        <Badge variant="outline" className={rowBadgeClass(storageState)}>
          <span className={dotClass(storageState)} aria-hidden />
          {storageLabel}
        </Badge>

        <Badge variant="outline" className={rowBadgeClass(aiState)}>
          <span className={dotClass(aiState)} aria-hidden />
          {aiLabel}
        </Badge>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2.5 text-xs text-muted-foreground"
          title="Calls OpenAI once (uses a tiny bit of API usage)"
          onClick={() => void refresh({ probe: true, notify: true })}
          disabled={loading}
        >
          {loading ? "Checking…" : "Test OpenAI"}
        </Button>
      </div>

      {!loading && detailLines.length > 0 && (
        <p
          className={cn(
            "max-w-md text-xs leading-relaxed sm:text-right",
            aiState === "error" || storageState === "error"
              ? "text-coral"
              : "text-muted-foreground"
          )}
        >
          {detailLines.join(" · ")}
        </p>
      )}
    </div>
  );
}
