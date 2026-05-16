"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

function scheduleNavigation(fn: () => void): void {
  if (typeof window === "undefined") return;
  window.setTimeout(fn, 0);
}

/**
 * Defer navigation until after mount (avoids
 * "Router action dispatched before initialization" in Next 16 dev/HMR).
 */
export function useSafeNavigate() {
  const router = useRouter();
  const routerRef = useRef(router);
  const mountedRef = useRef(false);

  useEffect(() => {
    routerRef.current = router;
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, [router]);

  const navigate = useCallback((href: string, options?: { replace?: boolean }) => {
    scheduleNavigation(() => {
      if (!mountedRef.current) {
        window.location.assign(href);
        return;
      }
      try {
        const r = routerRef.current;
        if (options?.replace) {
          r.replace(href);
        } else {
          r.push(href);
        }
      } catch {
        window.location.assign(href);
      }
    });
  }, []);

  return navigate;
}
