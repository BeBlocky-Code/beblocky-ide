import { cookies, headers } from "next/headers";
import { authServiceServerBase } from "@/lib/auth-service-url";
import { sessionFromAccount, type AccountPayload } from "@/lib/learn-session";
import { isPrefetchRequest } from "@/lib/prefetch-request";
import { normalizeSessionToken } from "@/lib/session-token";
import type { SessionData } from "@/lib/auth-client";

const AUTH_TIMEOUT_MS = 1500;

/**
 * Session already verified against auth-service, for the learn layout to pass
 * into the client. One server call replaces the browser's serial
 * `/auth/session` then `/account` round trips. Prefetch requests skip the
 * call so a hovered link cannot stampede auth-service.
 */
export async function getLearnSession(): Promise<SessionData | null> {
  const headerList = await headers();
  if (isPrefetchRequest((name) => headerList.get(name))) return null;

  const jar = await cookies();
  const token = normalizeSessionToken(
    jar.get("session")?.value ||
      jar.get("__Secure-session")?.value ||
      jar.get("__Host-session")?.value,
  );
  if (!token) return null;

  try {
    const res = await fetch(`${authServiceServerBase()}/api/v1/account`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Cookie: `session=${token}`,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(AUTH_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const account = (await res.json()) as AccountPayload;
    return sessionFromAccount(token, account);
  } catch {
    return null;
  }
}
