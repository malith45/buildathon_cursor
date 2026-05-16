"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import * as authApi from "@/lib/auth-api";
import { clearToken, getToken, setToken } from "@/lib/auth-storage";
import type { HealthProfile, User } from "@/lib/types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateHealthProfile: (profile: HealthProfile) => Promise<void>;
  updateName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await authApi.fetchMe();
      setUser(me);
    } catch {
      clearToken();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { user: u, token } = await authApi.login(email, password);
    setToken(token);
    setUser(u);
  }, []);

  const signup = useCallback(
    async (email: string, password: string, name: string) => {
      const { user: u, token } = await authApi.signup(email, password, name);
      setToken(token);
      setUser(u);
    },
    []
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const updateHealthProfile = useCallback(
    async (healthProfile: HealthProfile) => {
      const u = await authApi.updateProfile({ healthProfile });
      setUser(u);
    },
    []
  );

  const updateName = useCallback(async (name: string) => {
    const u = await authApi.updateProfile({ name });
    setUser(u);
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      signup,
      logout,
      refreshUser,
      updateHealthProfile,
      updateName,
    }),
    [
      user,
      loading,
      login,
      signup,
      logout,
      refreshUser,
      updateHealthProfile,
      updateName,
    ]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
