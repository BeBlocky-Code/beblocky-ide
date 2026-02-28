import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "https://beblocky.com";

export function middleware(request: NextRequest) {
  // Redirect IDE root to main app; learn route is /courses/[courseId]/learn (handled by app)
  if (request.nextUrl.pathname === "/") {
    return NextResponse.redirect(APP_URL);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
