"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";
import { Toaster } from "@/components/ui/sonner";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppHeader />
      {children}
      <Toaster />
    </AuthProvider>
  );
}
