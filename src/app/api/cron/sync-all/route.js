import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { syncLogin } from "@/lib/account-sync";

// Nightly sync for every active login, at 01:00 IST (19:30 UTC). See vercel.json.
export const maxDuration = 300;

export async function GET(request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const users = await sql`select id from fb_users where status = 'active'`;
  const results = [];
  for (const user of users) {
    try {
      results.push({ user: user.id, ...(await syncLogin(user.id)) });
    } catch (err) {
      console.error(`Nightly sync failed for ${user.id}:`, err);
      results.push({ user: user.id, ok: false, failures: [err.message] });
    }
  }
  return NextResponse.json({ logins: results.length, results });
}
