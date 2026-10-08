import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// Day-by-day snapshots for one post the logged-in user owns.
export async function GET(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const postId = new URL(request.url).searchParams.get("post");
  if (!postId) return NextResponse.json({ error: "missing_post" }, { status: 400 });

  const rows = await sql`
    select to_char(s.snapshot_date, 'YYYY-MM-DD') as date, s.metrics, s.followers
    from ig_post_snapshots s
    join ig_posts p on p.ig_id = s.ig_id
    join ig_accounts a on a.id = p.account_id
    join fb_users u on u.id = a.fb_user_id
    where s.ig_id = ${postId} and u.id = ${session.userId}
    order by s.snapshot_date
  `;
  return NextResponse.json({ history: rows });
}
