/**
 * Auth client for session checks. Uses NEXT_PUBLIC_APP_SERVICE_URL (auth service)
 * so we never hardcode localhost:8080. Session endpoint: ${APP_SERVICE_URL}/api/v1/auth/session
 */

const PRODUCTION_AUTH_SERVICE = "https://auth-service.beblocky.com";

function isLoopbackUrl(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "[::1]"
    );
  } catch {
    return false;
  }
}

function authServiceBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_SERVICE_URL?.trim();
  if (process.env.NODE_ENV === "production") {
    if (fromEnv && !isLoopbackUrl(fromEnv)) {
      return fromEnv.replace(/\/$/, "");
    }
    return PRODUCTION_AUTH_SERVICE;
  }
  return (fromEnv || "http://localhost:8080").replace(/\/$/, "");
}

const AUTH_BASE = `${authServiceBase()}/api/v1`;

export type SessionUser = {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  roles?: string[];
};

export type SessionData = {
  valid: boolean;
  user?: SessionUser;
  token?: string;
};

async function authFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<{
  data?: T;
  error?: { code: string; message: string };
  status: number;
}> {
  const url = `${AUTH_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const text = await res.text();
  let data: T | undefined;
  let error: { code: string; message: string } | undefined;
  try {
    const json = text ? JSON.parse(text) : {};
    if (res.ok) data = json as T;
    else
      error = {
        code: json.error?.code ?? "ERROR",
        message: json.error?.message ?? res.statusText,
      };
  } catch {
    if (!res.ok)
      error = { code: "ERROR", message: res.statusText || "Request failed" };
  }
  return { data, error, status: res.status };
}

let cachedSession: { data?: SessionData; error?: { code: string; message: string } } | null =
  null;
let cachedSessionAt = 0;
let sessionInflight: Promise<{
  data?: SessionData;
  error?: { code: string; message: string };
}> | null = null;
const SESSION_TTL_MS = 5 * 60 * 1000;

export async function getSession(): Promise<{
  data?: SessionData;
  error?: { code: string; message: string };
}> {
  if (cachedSession && Date.now() - cachedSessionAt < SESSION_TTL_MS) {
    return cachedSession;
  }

  // Deduplicate concurrent session+account fetches across apiCall callers.
  if (sessionInflight) return sessionInflight;

  sessionInflight = (async () => {
    const {
      data: sessionData,
      error,
      status,
    } = await authFetch<{
      valid?: boolean;
      user?: { id: string };
      token?: string;
      session?: unknown;
    }>("/auth/session");

    if (status === 200 && sessionData?.valid && sessionData?.user?.id) {
      const user: SessionUser = { id: sessionData.user.id };
      const accountRes = await authFetch<{
        name?: string;
        email?: string;
        image_url?: string;
        roles?: string[];
      }>("/account");
      if (accountRes.data) {
        user.name = accountRes.data.name;
        user.email = accountRes.data.email;
        user.image = accountRes.data.image_url;
        user.roles = accountRes.data.roles ?? [];
      }
      const result = {
        data: { valid: true, user, token: sessionData.token } as SessionData,
      };
      cachedSession = result;
      cachedSessionAt = Date.now();
      return result;
    }
    return { data: { valid: false } as SessionData, error };
  })().finally(() => {
    sessionInflight = null;
  });

  return sessionInflight;
}

export function clearSessionCache() {
  cachedSession = null;
  cachedSessionAt = 0;
  sessionInflight = null;
}

/**
 * Headers for calling beblocky-api endpoints protected by BearerAuthGuard.
 * Session cookies are host-only, so cross-origin API calls need Bearer.
 */
export async function getApiAuthHeaders(): Promise<Record<string, string>> {
  const { data: session } = await getSession();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }
  return headers;
}

export async function signOut(): Promise<void> {
  clearSessionCache();
  await authFetch("/auth/logout", { method: "POST" });
}

export { useSession } from "./use-session";
