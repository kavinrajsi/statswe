import { NextResponse } from "next/server";
import { syncLogin } from "@/lib/account-sync";
import { readSession, SESSION_COOKIE } from "@/lib/session";

export const maxDuration = 300;

// Manual sync for the logged-in user: pulls everything the dashboard shows from Meta into the database.
export async function POST(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    return NextResponse.json(await syncLogin(session.userId));
  } catch (err) {
    console.error("Manual sync failed:", err);
    return NextResponse.json({ error: "sync_failed" }, { status: 500 });
  }
}
