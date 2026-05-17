"use client";

import { useLayoutEffect } from "react";
import {
  observeExtensionAttrs,
  stripExtensionAttrsNow,
} from "@/lib/extension-hydration";

if (typeof document !== "undefined") {
  stripExtensionAttrsNow();
}

/** Strips AV/extension attributes so they do not confuse React hydration. */
export default function ExtensionHydrationGuard() {
  useLayoutEffect(() => {
    stripExtensionAttrsNow();

    const existing = window.__mediassistHydrationGuard;
    if (existing) {
      return () => existing.disconnect();
    }

    return observeExtensionAttrs();
  }, []);

  return null;
}
