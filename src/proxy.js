import { NextResponse } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// Optimistic check only: real access control happens in the dashboard page.
export async function proxy(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    // Behind the ngrok tunnel request.url can point at localhost, so use the forwarded host
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    const proto = request.headers.get("x-forwarded-proto") ?? "https";
    return NextResponse.redirect(new URL("/", `${proto}://${host}`));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*"],
};
