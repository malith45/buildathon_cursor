"use client";

import { AuthProvider } from "@/contexts/AuthContext";
import AppHeader from "@/components/AppHeader";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppHeader />
      {children}
    </AuthProvider>
  );
}
