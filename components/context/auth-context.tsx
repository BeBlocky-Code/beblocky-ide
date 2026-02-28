"use client";

import type React from "react";
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getSession, signOut as authSignOut } from "@/lib/auth-client";

type User = {
  id: string;
  displayName: string;
};

type AuthContextType = {
  user: User | null;
  isPending: boolean;
  login: (name: string) => void;
  logout: () => void;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isPending, setIsPending] = useState(true);

  const refetch = useCallback(async () => {
    const { data } = await getSession();
    if (data?.valid && data?.user?.id) {
      setUser({
        id: data.user.id,
        displayName: data.user.name || data.user.email || "User",
      });
    } else {
      setUser(null);
    }
    setIsPending(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const login = (_name: string) => {
    refetch();
  };

  const logout = useCallback(async () => {
    await authSignOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isPending, login, logout, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used inside <AuthProvider>");
  return ctx;
}
