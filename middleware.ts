import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_APP_URL = process.env.NEXT_PUBLIC_AUTH_APP_URL || "http://localhost:3000";

export async function middleware(request: NextRequest) {
  const sessionToken = request.cookies.get("session")?.value;
  if (!sessionToken) {
    const base = AUTH_APP_URL.replace(/\/$/, "");
    const url = base + "?callbackUrl=" + encodeURIComponent(request.url) + "&origin=client";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
