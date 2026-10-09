import { sql } from "@/lib/db";

export const TYPES = ["all", "posts", "reels", "stories"];
export const RANGES = [7, 14, 30, 90];
export const SORTS = ["newest", "highest", "lowest"];
// "accounts" is account-wide only (no per-content value), so it can't sort the list.
export const METRICS = ["accounts", "interactions", "shares", "viewers", "views"];
const MAX_ITEMS = 50;

// Meta gives lifetime totals per post. The numbers for a range are the latest total minus the total at the start of the range.
// A post published inside the range counts its full latest total. A post older than the range needs a snapshot from before the
// range start; without one its value is null. Posts and reels are listed by publish date.
//
// Returns { items, earliestSnapshot } where earliestSnapshot is the first day with stored snapshots ("YYYY-MM-DD" or null).
export async function loadContent({ accountId, userId, type, days, metric, sort }) {
  const now = Date.now();
  const since = new Date(now - days * 86400000).toISOString();
  const startDay = since.slice(0, 10);

  const [posts, stories, [first]] = await Promise.all([
    type === "stories"
      ? []
      : sql`
          select p.ig_id, p.media_product_type, p.media_type, p.thumbnail_url, p.media_url, p.permalink, p.ts,
                 latest.metrics as m_latest, base.metrics as m_base
          from ig_posts p
          join ig_accounts a on a.id = p.account_id
          join fb_users u on u.id = a.fb_user_id
          left join lateral (
            select metrics from ig_post_snapshots
            where ig_id = p.ig_id
            order by snapshot_date desc
            limit 1
          ) latest on true
          left join lateral (
            select metrics from ig_post_snapshots
            where ig_id = p.ig_id and snapshot_date <= ${startDay}::date
            order by snapshot_date desc
            limit 1
          ) base on true
          where p.account_id = ${accountId} and u.id = ${userId} and p.source = 'own' and p.ts >= ${since}
            and (
              ${type} = 'all'
              or (${type} = 'reels' and p.media_product_type = 'REELS')
              or (${type} = 'posts' and (p.media_product_type is null or p.media_product_type <> 'REELS'))
            )
        `,
    type === "posts" || type === "reels"
      ? []
      : sql`
          select st.ig_id, st.media_type, st.thumbnail_url, st.media_url, st.permalink, st.ts,
                 (st.metrics->>'views')::int as views,
                 (st.metrics->>'reach')::int as viewers,
                 (st.metrics->>'total_interactions')::int as interactions,
                 (st.metrics->>'shares')::int as shares
          from ig_stories st
          join ig_accounts a on a.id = st.account_id
          join fb_users u on u.id = a.fb_user_id
          where st.account_id = ${accountId} and u.id = ${userId} and st.ts >= ${since}
        `,
    sql`select to_char(min(snapshot_date), 'YYYY-MM-DD') as first_day from ig_post_snapshots`,
  ]);

  const postItems = posts.map((p) => {
    const kind = p.media_product_type === "REELS" ? "reel" : "post";
    const publishedInRange = new Date(p.ts).getTime() >= now - days * 86400000;
    const value = (key) => periodValue(p.m_latest, p.m_base, key, publishedInRange);
    return {
      ig_id: p.ig_id,
      kind,
      ts: p.ts,
      media_type: p.media_type,
      thumbnail_url: p.thumbnail_url,
      media_url: p.media_url,
      permalink: p.permalink,
      views: value("views"),
      viewers: value("reach"),
      interactions: value("total_interactions"),
      shares: value("shares"),
    };
  });

  const storyItems = stories.map((s) => ({ ...s, kind: "story" }));
  const items = [...postItems, ...storyItems];

  const key = METRICS.includes(metric) && metric !== "accounts" ? metric : "views";
  const byMetric = (a, b, dir) => {
    const x = a[key];
    const y = b[key];
    if (x == null && y == null) return 0;
    if (x == null) return 1; // nulls last
    if (y == null) return -1;
    return dir * (y - x);
  };
  if (sort === "highest") items.sort((a, b) => byMetric(a, b, 1));
  else if (sort === "lowest") items.sort((a, b) => byMetric(a, b, -1));
  else items.sort((a, b) => new Date(b.ts) - new Date(a.ts));

  return { items: items.slice(0, MAX_ITEMS), earliestSnapshot: first?.first_day ?? null };
}

// One metric for a range: latest total minus the total at the range start.
function periodValue(latest, base, key, publishedInRange) {
  const l = latest?.[key];
  if (l === undefined || l === null) return null;
  if (base) return Math.max(0, l - (base[key] ?? 0));
  return publishedInRange ? l : null;
}
