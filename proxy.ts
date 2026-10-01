import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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

const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
const APP_URL =
  process.env.NODE_ENV === "production"
    ? fromEnv && !isLoopbackUrl(fromEnv)
      ? fromEnv
      : "https://code.beblocky.com"
    : fromEnv || "https://beblocky.com";

export function proxy(request: NextRequest) {
  // Redirect IDE root to main app; learn route is /courses/[courseId]/learn (handled by app)
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(APP_URL);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
