import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// Your account next to the saved competitors: followers, posts, 30-day change, engagement and a 30-day trend.
// Read only from the database; the nightly sync and the Sync now button keep it current.
export async function GET(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const accountId = new URL(request.url).searchParams.get("account");
  if (!accountId) return NextResponse.json({ error: "missing_account" }, { status: 400 });

  const [me] = await sql`
    select a.id, a.ig_user_id, a.username, a.name, a.profile_picture_url, a.followers_count, a.follows_count, a.media_count
    from ig_accounts a
    join fb_users u on u.id = a.fb_user_id
    where a.id = ${accountId} and u.id = ${session.userId}
  `;
  if (!me) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const [own] = await sql`
    select count(*) filter (where ts >= now() - interval '30 days')::int as posts_30d,
           (select avg(like_count) from (select like_count from ig_posts
              where account_id = ${accountId} and source = 'own' order by ts desc limit 12) t) as avg_likes,
           (select avg(comments_count) from (select comments_count from ig_posts
              where account_id = ${accountId} and source = 'own' order by ts desc limit 12) t) as avg_comments
    from ig_posts
    where account_id = ${accountId} and source = 'own'
  `;
  const [gain] = await sql`
    select sum(follower_net)::int as gained from account_daily
    where ig_user_id = ${me.ig_user_id} and day >= current_date - 30
  `;
  const meDaily = await sql`
    select to_char(day, 'YYYY-MM-DD') as date, follower_net from account_daily
    where ig_user_id = ${me.ig_user_id} and day >= current_date - 30 and day <= current_date order by day
  `;

  const latest = await sql`
    select c.username, s.name, s.picture_url, s.followers, s.following, s.media_count, s.posts_30d,
           s.avg_likes, s.avg_comments, s.top_post, to_char(s.day, 'YYYY-MM-DD') as as_of
    from ig_competitors c
    left join lateral (
      select * from competitor_stats
      where fb_user_id = c.fb_user_id and username = c.username
      order by day desc limit 1
    ) s on true
    where c.fb_user_id = ${session.userId}
    order by c.username
  `;

  const history = await sql`
    select username, to_char(snapshot_date, 'YYYY-MM-DD') as date, followers
    from ig_lookup_followers
    where fb_user_id = ${session.userId} and snapshot_date >= current_date - 30
    order by username, snapshot_date
  `;
  const byUser = new Map();
  for (const h of history) {
    if (!byUser.has(h.username)) byUser.set(h.username, []);
    byUser.get(h.username).push({ date: h.date, followers: h.followers });
  }

  const engagement = (avgLikes, avgComments, followers) =>
    followers && avgLikes != null ? ((Number(avgLikes) + Number(avgComments ?? 0)) / followers) * 100 : null;

  // Your 30-day trend: today's count walked back by the daily net change, as % change from the first day
  const myFollowers = me.followers_count;
  const myPoints = [];
  let total = myFollowers;
  for (let i = meDaily.length - 1; i >= 0 && myFollowers != null; i -= 1) {
    myPoints.unshift({ date: meDaily[i].date, followers: total });
    total -= meDaily[i].follower_net ?? 0;
  }

  const pctSeries = (points) => {
    if (!points.length || !points[0].followers) return [];
    return points.map((p) => ({ date: p.date, pct: ((p.followers - points[0].followers) / points[0].followers) * 100 }));
  };

  const competitors = latest.map((c) => {
    const points = byUser.get(c.username) ?? [];
    const gained = points.length >= 2 ? points[points.length - 1].followers - points[0].followers : null;
    return {
      username: c.username,
      name: c.name,
      pictureUrl: c.picture_url,
      followers: c.followers,
      following: c.following,
      posts: c.media_count,
      posts30: c.posts_30d,
      gained30: gained,
      avgLikes: c.avg_likes,
      avgComments: c.avg_comments,
      engagementRate: engagement(c.avg_likes, c.avg_comments, c.followers),
      topPost: c.top_post,
      asOf: c.as_of,
      series: pctSeries(points),
    };
  });

  return NextResponse.json({
    you: {
      username: me.username,
      name: me.name,
      pictureUrl: me.profile_picture_url,
      followers: me.followers_count,
      following: me.follows_count,
      posts: me.media_count,
      posts30: own?.posts_30d ?? 0,
      gained30: gain?.gained ?? null,
      avgLikes: own?.avg_likes ?? null,
      avgComments: own?.avg_comments ?? null,
      engagementRate: engagement(own?.avg_likes, own?.avg_comments, me.followers_count),
      series: pctSeries(myPoints),
    },
    competitors,
    synced: competitors.some((c) => c.followers !== null),
  });
}
