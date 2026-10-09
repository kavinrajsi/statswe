import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// When followers are online (IST, weekday by hour), from the nightly sync.
export async function GET(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const accountId = new URL(request.url).searchParams.get("account");
  if (!accountId) return NextResponse.json({ error: "missing_account" }, { status: 400 });

  const [row] = await sql`
    select a.ig_user_id from ig_accounts a join fb_users u on u.id = a.fb_user_id
    where a.id = ${accountId} and u.id = ${session.userId}
  `;
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [s] = await sql`select data from account_activity where ig_user_id = ${row.ig_user_id}`;
  if (!s) return NextResponse.json({ error: "not_synced" }, { status: 404 });
  return NextResponse.json(s.data);
}
