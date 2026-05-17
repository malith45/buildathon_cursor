"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/contexts/AuthContext";
import ThemeProvider from "@/components/ThemeProvider";
import ExtensionHydrationGuard from "@/components/ExtensionHydrationGuard";
import AppHeader from "@/components/AppHeader";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <ThemeProvider>
      <ExtensionHydrationGuard />
      <AuthProvider>
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          suppressHydrationWarning
        >
          <AppHeader />
          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col",
              isHome
                ? "overflow-hidden"
                : "overflow-y-auto overscroll-y-contain"
            )}
          >
            {children}
          </div>
          <Toaster />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}
