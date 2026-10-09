import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { readSession, SESSION_COOKIE } from "@/lib/session";

const PERIODS = new Set(["30d", "mtd", "prev"]);

// Views, viewers and interactions for one account and period, from the nightly sync.
export async function GET(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("account");
  if (!accountId) return NextResponse.json({ error: "missing_account" }, { status: 400 });
  const period = PERIODS.has(searchParams.get("period")) ? searchParams.get("period") : "30d";

  const [row] = await sql`
    select a.ig_user_id from ig_accounts a join fb_users u on u.id = a.fb_user_id
    where a.id = ${accountId} and u.id = ${session.userId}
  `;
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [s] = await sql`select data from account_summary where ig_user_id = ${row.ig_user_id} and period = ${period}`;
  if (!s) return NextResponse.json({ error: "not_synced" }, { status: 404 });
  return NextResponse.json({ period, ...s.data.audience });
}
