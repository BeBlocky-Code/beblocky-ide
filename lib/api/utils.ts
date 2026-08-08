import { getSession, clearSessionCache } from "@/lib/auth-client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://api.beblocky.com";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** In-memory Bearer so every apiCall does not re-hit /auth/session + /account. */
let cachedToken: string | null | undefined;
let tokenPromise: Promise<string | null> | null = null;
const TOKEN_TTL_MS = 5 * 60 * 1000;
let tokenCachedAt = 0;

async function resolveBearerToken(): Promise<string | null> {
  const fresh =
    cachedToken !== undefined && Date.now() - tokenCachedAt < TOKEN_TTL_MS;
  if (fresh) return cachedToken ?? null;

  if (!tokenPromise) {
    tokenPromise = getSession()
      .then(({ data }) => {
        cachedToken = data?.token ?? null;
        tokenCachedAt = Date.now();
        return cachedToken;
      })
      .finally(() => {
        tokenPromise = null;
      });
  }
  return tokenPromise;
}

export function clearApiAuthCache() {
  cachedToken = undefined;
  tokenCachedAt = 0;
  clearSessionCache();
}

/**
 * Fetch helper for beblocky-api. Attaches Authorization: Bearer from a
 * short-lived in-memory session cache (cleared on 401).
 */
export async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = await resolveBearerToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) ?? {}),
  };
  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: "include",
  });

  if (response.status === 401) {
    clearApiAuthCache();
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      `API call failed: ${response.statusText}`
    );
  }

  return response.json();
}
