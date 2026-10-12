/**
 * Session tokens are URL-safe base64 and often end with "=".
 * Browsers may percent-encode cookie values ("=" → "%3D"), which breaks
 * auth-api token hashing. Always normalize before using a session token.
 */
export function normalizeSessionToken(
  raw: string | undefined | null,
): string | undefined {
  if (!raw) return undefined;
  let token = raw.trim();
  if (!token) return undefined;
  if (/%[0-9A-Fa-f]{2}/.test(token)) {
    try {
      token = decodeURIComponent(token);
    } catch {
      // keep the raw value
    }
  }
  return token;
}
