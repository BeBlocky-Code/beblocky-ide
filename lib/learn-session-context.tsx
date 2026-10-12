"use client";

import { createContext, useContext } from "react";
import type { SessionData } from "@/lib/auth-client";

const LearnSessionContext = createContext<SessionData | null>(null);

export function LearnSessionContextProvider({
  session,
  children,
}: {
  session: SessionData | null;
  children: React.ReactNode;
}) {
  return (
    <LearnSessionContext.Provider value={session}>
      {children}
    </LearnSessionContext.Provider>
  );
}

export function useLearnSession(): SessionData | null {
  return useContext(LearnSessionContext);
}
