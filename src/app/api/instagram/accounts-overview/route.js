import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// Followers, reach and profile visits (month to date) for every Instagram account of the logged-in user.
// Read from the database; the nightly sync and the Sync button keep it current.
export async function GET(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const accounts = await sql`
    select a.id, a.username, a.name, a.profile_picture_url, a.followers_count, a.ig_user_id,
           s.data as mtd
    from ig_accounts a
    join fb_users u on u.id = a.fb_user_id
    left join account_summary s on s.ig_user_id = a.ig_user_id and s.period = 'mtd'
    where u.id = ${session.userId}
    order by a.username
  `;

  return NextResponse.json({
    accounts: accounts.map((a) => ({
      id: a.id,
      username: a.username,
      name: a.name,
      pictureUrl: a.profile_picture_url,
      followers: a.followers_count,
      reach: a.mtd?.audience?.viewers?.total ?? null,
      profileViews: a.mtd?.profileViews ?? null,
      error: a.mtd ? null : "not_synced",
    })),
  });
}
