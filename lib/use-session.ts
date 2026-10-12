"use client";

import { useState, useEffect, useCallback } from "react";
import { clearSessionCache, getSession, type SessionData } from "./auth-client";
import { useLearnSession } from "./learn-session-context";

export function useSession() {
  const seeded = useLearnSession();
  const hasServerSession = seeded?.valid === true && seeded.user != null;
  const [data, setData] = useState<SessionData | null>(
    hasServerSession ? seeded : null,
  );
  const [isPending, setIsPending] = useState(!hasServerSession);

  const refetch = useCallback(async () => {
    setIsPending(true);
    clearSessionCache();
    const { data: session } = await getSession();
    setData(session ?? null);
    setIsPending(false);
  }, []);

  useEffect(() => {
    if (hasServerSession) return;
    let cancelled = false;
    void getSession().then(({ data: session }) => {
      if (cancelled) return;
      setData(session ?? null);
      setIsPending(false);
    });
    return () => {
      cancelled = true;
    };
  }, [hasServerSession]);

  return {
    data: data ?? undefined,
    isPending,
    refetch,
  };
}
