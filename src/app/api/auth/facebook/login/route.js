import { NextResponse } from "next/server";
import { loginUrl } from "@/lib/meta";
import { STATE_COOKIE, stateCookieOptions } from "@/lib/session";

export async function GET() {
  const state = crypto.randomUUID();
  const res = NextResponse.redirect(loginUrl(state));
  res.cookies.set(STATE_COOKIE, state, stateCookieOptions);
  return res;
}
