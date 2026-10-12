"use client";

import { useLayoutEffect } from "react";
import { rememberSession, type SessionData } from "@/lib/auth-client";
import {
  LearnSessionContextProvider,
} from "@/lib/learn-session-context";

export function LearnSessionProvider({
  session,
  children,
}: {
  session: SessionData | null;
  children: React.ReactNode;
}) {
  useLayoutEffect(() => {
    if (session?.valid && session.user && session.token) {
      rememberSession(session);
    }
  }, [session]);

  return (
    <LearnSessionContextProvider session={session}>
      {children}
    </LearnSessionContextProvider>
  );
}
