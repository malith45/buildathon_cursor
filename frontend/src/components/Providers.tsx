"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/contexts/AuthContext";
import ThemeProvider from "@/components/ThemeProvider";
import ExtensionHydrationGuard from "@/components/ExtensionHydrationGuard";
import AppHeader from "@/components/AppHeader";
import OnboardingDialog from "@/components/OnboardingDialog";
import SystemBanners from "@/components/SystemBanners";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <ThemeProvider>
      <ExtensionHydrationGuard />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-14 focus:z-50 focus:rounded-lg focus:border-2 focus:border-foreground focus:bg-card focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
      >
        Skip to main content
      </a>
      <AuthProvider>
        <OnboardingDialog />
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          suppressHydrationWarning
        >
          <AppHeader />
          <SystemBanners />
          <div
            id="main-content"
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
