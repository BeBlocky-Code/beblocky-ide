const AUTH_SERVICE_URL = process.env.NEXT_PUBLIC_AUTH_SERVICE_URL ?? "http://localhost:8080";
const AUTH_BASE = AUTH_SERVICE_URL.replace(/\/$/, "") + "/api/v1";

export type SessionUser = {
  id: string;
  name?: string;
  email?: string;
  image?: string;
  /** Roles from auth-service /account (e.g. ["student"], ["parent"]) */
  roles?: string[];
};

export type SessionData = {
  valid: boolean;
  user?: SessionUser;
  /** Session token for Authorization: Bearer when calling beblocky-api */
  token?: string;
};

async function authFetch<T>(path: string, options: RequestInit = {}): Promise<{ data?: T; error?: { code: string; message: string }; status: number }> {
  const res = await fetch(AUTH_BASE + path, { ...options, credentials: "include", headers: { "Content-Type": "application/json", ...options.headers } });
  const text = await res.text();
  let data: T | undefined;
  let error: { code: string; message: string } | undefined;
  try {
    const json = text ? JSON.parse(text) : {};
    if (res.ok) data = json as T;
    else error = { code: json.error?.code ?? "ERROR", message: json.error?.message ?? res.statusText };
  } catch {
    if (!res.ok) error = { code: "ERROR", message: res.statusText || "Request failed" };
  }
  return { data, error, status: res.status };
}

export async function getSession(): Promise<{ data?: SessionData; error?: { code: string; message: string } }> {
  const { data: sessionData, error, status } = await authFetch<{ valid?: boolean; user?: { id: string }; token?: string }>("/auth/session");
  if (status === 200 && sessionData?.valid && sessionData?.user?.id) {
    const user: SessionUser = { id: sessionData.user.id };
    const accountRes = await authFetch<{ name?: string; email?: string; image_url?: string; roles?: string[] }>("/account");
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
