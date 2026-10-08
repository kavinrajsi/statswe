import { NextResponse } from "next/server";
import { redirectTo } from "@/lib/redirect";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(request) {
  const res = redirectTo("/");
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
