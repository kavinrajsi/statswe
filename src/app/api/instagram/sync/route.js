import { NextResponse } from "next/server";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import { syncUser } from "@/lib/sync";

// Manual re-sync for all IG accounts linked to the logged-in user
export async function POST(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    await syncUser(session.userId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Manual sync failed:", err);
    return NextResponse.json({ error: "sync_failed" }, { status: 502 });
  }
}
