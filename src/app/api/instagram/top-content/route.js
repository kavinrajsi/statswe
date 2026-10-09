import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// Top own posts by lifetime views and by interactions, from the latest stored snapshot of each post. No Meta calls.
export async function GET(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("account");
  if (!accountId) return NextResponse.json({ error: "missing_account" }, { status: 400 });
  const limit = Math.min(22, Math.max(1, Number.parseInt(searchParams.get("limit") ?? "5", 10) || 5));

  // Latest snapshot per post, for posts of this account that the logged-in user owns.
  // The lateral join picks one snapshot row per post; the outer query ranks them.
  const [views, interactions] = await Promise.all([
    sql`
      select * from (
        select p.ig_id, p.caption, p.media_type, p.permalink, p.thumbnail_url, p.media_url, p.ts,
               (s.metrics->>'views')::int as views,
               (s.metrics->>'total_interactions')::int as interactions,
               to_char(s.snapshot_date, 'YYYY-MM-DD') as as_of
        from ig_posts p
        join ig_accounts a on a.id = p.account_id
        join fb_users u on u.id = a.fb_user_id
        join lateral (
          select metrics, snapshot_date from ig_post_snapshots
          where ig_id = p.ig_id
          order by snapshot_date desc
          limit 1
        ) s on true
        where p.account_id = ${accountId} and u.id = ${session.userId} and p.source = 'own'
      ) t
      where views is not null
      order by views desc
      limit ${limit}
    `,
    sql`
      select * from (
        select p.ig_id, p.caption, p.media_type, p.permalink, p.thumbnail_url, p.media_url, p.ts,
               (s.metrics->>'views')::int as views,
               (s.metrics->>'total_interactions')::int as interactions,
               to_char(s.snapshot_date, 'YYYY-MM-DD') as as_of
        from ig_posts p
        join ig_accounts a on a.id = p.account_id
        join fb_users u on u.id = a.fb_user_id
        join lateral (
          select metrics, snapshot_date from ig_post_snapshots
          where ig_id = p.ig_id
          order by snapshot_date desc
          limit 1
        ) s on true
        where p.account_id = ${accountId} and u.id = ${session.userId} and p.source = 'own'
      ) t
      where interactions is not null
      order by interactions desc
      limit ${limit}
    `,
  ]);

  return NextResponse.json({ limit, views, interactions });
}
