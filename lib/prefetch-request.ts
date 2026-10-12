/** True when this request is a Next.js or browser prefetch. */
export function isPrefetchRequest(
  headerGet: (name: string) => string | null,
): boolean {
  if (headerGet("next-router-prefetch")) return true;
  if (headerGet("next-router-segment-prefetch")) return true;
  const purpose = `${headerGet("purpose") ?? ""} ${headerGet("sec-purpose") ?? ""}`;
  return purpose.toLowerCase().includes("prefetch");
}
