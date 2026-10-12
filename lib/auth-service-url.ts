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

/**
 * Origin for auth-service calls made by the Next.js server.
 * Prefers AUTH_SERVICE_INTERNAL_URL so a container can reach auth-api on the
 * Docker network. Read at request time; NEXT_PUBLIC_* values are frozen at build.
 */
export function authServiceServerBase(): string {
  const internal = process.env.AUTH_SERVICE_INTERNAL_URL?.trim();
  if (internal) return internal.replace(/\/$/, "");

  const fromEnv = [
    process.env.AUTH_SERVICE_URL,
    process.env.NEXT_PUBLIC_APP_SERVICE_URL,
    process.env.NEXT_PUBLIC_AUTH_SERVICE_URL,
  ]
    .map((value) => value?.trim())
    .find((value): value is string => Boolean(value));

  if (process.env.NODE_ENV === "production") {
    if (fromEnv && !isLoopbackUrl(fromEnv)) return fromEnv.replace(/\/$/, "");
    return PRODUCTION_AUTH_SERVICE;
  }

  return (fromEnv || "http://localhost:8080").replace(/\/$/, "");
}
