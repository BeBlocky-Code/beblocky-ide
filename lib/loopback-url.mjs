export const PRODUCTION_AUTH_SERVICE = "https://auth-service.beblocky.com";

export function isLoopbackUrl(raw) {
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
