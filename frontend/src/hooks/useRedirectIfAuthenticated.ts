"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { authRedirect } from "@/lib/auth-redirect";

const AUTH_PATHS = new Set(["/login", "/signup"]);

/**
 * When already signed in, leave login/signup so users are not stuck on auth forms.
 */
export function useRedirectIfAuthenticated(destination = "/") {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || !user || !AUTH_PATHS.has(pathname)) return;
    authRedirect(destination);
  }, [user, loading, pathname, destination]);
}
