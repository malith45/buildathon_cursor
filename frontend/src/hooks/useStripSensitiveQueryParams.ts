"use client";

import { useEffect } from "react";

const SENSITIVE_KEYS = ["email", "password", "name"] as const;

/** Remove credentials accidentally sent via GET (default form method). */
export function useStripSensitiveQueryParams() {
  useEffect(() => {
    const url = new URL(window.location.href);
    let changed = false;
    for (const key of SENSITIVE_KEYS) {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        changed = true;
      }
    }
    if (!changed) return;
    const qs = url.searchParams.toString();
    const next = url.pathname + (qs ? `?${qs}` : "") + url.hash;
    window.history.replaceState(null, "", next);
  }, []);
}
