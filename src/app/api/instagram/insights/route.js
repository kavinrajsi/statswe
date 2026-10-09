import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// Latest stored insights for one post, from the daily snapshots. Only posts that belong to the logged-in user are returned.
export async function GET(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const postId = new URL(request.url).searchParams.get("post");
  if (!postId) return NextResponse.json({ error: "missing_post" }, { status: 400 });

  const [row] = await sql`
    select s.metrics, s.followers, to_char(s.snapshot_date, 'YYYY-MM-DD') as as_of
    from ig_posts p
    join ig_accounts a on a.id = p.account_id
    join fb_users u on u.id = a.fb_user_id
    left join lateral (
      select metrics, followers, snapshot_date from ig_post_snapshots
      where ig_id = p.ig_id
      order by snapshot_date desc
      limit 1
    ) s on true
    where p.ig_id = ${postId} and u.id = ${session.userId}
  `;
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!row.metrics) return NextResponse.json({ metrics: {}, followers: null, error: "not_synced" });

  return NextResponse.json({ metrics: row.metrics, followers: row.followers, asOf: row.as_of });
}
