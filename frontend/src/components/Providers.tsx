"use client";

import { usePathname } from "next/navigation";
import { AuthProvider } from "@/contexts/AuthContext";
import ThemeProvider from "@/components/ThemeProvider";
import AppHeader from "@/components/AppHeader";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export default function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  return (
    <ThemeProvider>
      <AuthProvider>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
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
