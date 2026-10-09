import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import { redirectTo } from "@/lib/redirect";

// Deletes everything stored for the logged-in user, then logs them out.
// Tables keyed by ig_user_id have no foreign key, so they are cleared first (while ig_accounts still lists the accounts).
// Deleting the fb_users row cascades to accounts, posts, snapshots, stories, settings, competitors and lookups.
// city_geo is a shared lookup cache without personal data and is kept.
export async function POST(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  await sql.transaction([
    sql`delete from account_daily where ig_user_id in (select ig_user_id from ig_accounts where fb_user_id = ${session.userId})`,
    sql`delete from account_summary where ig_user_id in (select ig_user_id from ig_accounts where fb_user_id = ${session.userId})`,
    sql`delete from account_audience where ig_user_id in (select ig_user_id from ig_accounts where fb_user_id = ${session.userId})`,
    sql`delete from account_activity where ig_user_id in (select ig_user_id from ig_accounts where fb_user_id = ${session.userId})`,
    sql`delete from ig_account_monthly where ig_user_id in (select ig_user_id from ig_accounts where fb_user_id = ${session.userId})`,
    sql`delete from fb_users where id = ${session.userId}`,
  ]);

  const res = redirectTo("/");
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
