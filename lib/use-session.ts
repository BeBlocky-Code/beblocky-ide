"use client";

import { useState, useEffect, useCallback } from "react";
import { getSession, type SessionData } from "./auth-client";

export function useSession() {
  const [data, setData] = useState<SessionData | null>(null);
  const [isPending, setIsPending] = useState(true);

  const refetch = useCallback(async () => {
    setIsPending(true);
    const { data: session } = await getSession();
    setData(session ?? null);
    setIsPending(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    data: data ?? undefined,
    isPending,
    refetch,
  };
}
