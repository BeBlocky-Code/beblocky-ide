/**
 * Auth client for session checks. Uses NEXT_PUBLIC_APP_SERVICE_URL (auth service)
 * so we never hardcode localhost:8080. Session endpoint: ${APP_SERVICE_URL}/api/v1/auth/session
 */

// Auth service base; session at ${NEXT_PUBLIC_APP_SERVICE_URL}/api/v1/auth/session.
// Production: never uses localhost; use NEXT_PUBLIC_APP_SERVICE_URL or fallback to auth-service.beblocky.com.
// Development: set NEXT_PUBLIC_APP_SERVICE_URL in .env.local (e.g. http://localhost:8080) so session URL is explicit.
const AUTH_BASE =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_SERVICE_URL
    ? `${process.env.NEXT_PUBLIC_APP_SERVICE_URL.replace(/\/$/, "")}/api/v1`
    : process.env.NODE_ENV === "production"
      ? "https://auth-service.beblocky.com/api/v1"
      : "http://localhost:8080/api/v1"; // dev fallback only; set NEXT_PUBLIC_APP_SERVICE_URL to avoid hardcoded localhost

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

export async function getSession(): Promise<{
  data?: SessionData;
  error?: { code: string; message: string };
}> {
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
    return { data: { valid: true, user, token: sessionData.token } };
  }
  return { data: { valid: false }, error };
}

export async function signOut(): Promise<void> {
  await authFetch("/auth/logout", { method: "POST" });
}

export { useSession } from "./use-session";
