import { sql } from "@/lib/db";
import { fetchBusinessDiscovery, fetchRecentPostCount } from "@/lib/meta";
import { recordLookupFollowers } from "@/lib/lookup-followers";

const DAY = 86400;

// Saves today's public stats for each saved competitor of one login. A competitor that fails is logged and skipped.
// Returns { saved, failed }.
export async function storeCompetitorStats(userId, igUserId, token) {
  const competitors = await sql`select username from ig_competitors where fb_user_id = ${userId}`;
  const now = Math.floor(Date.now() / 1000);
  let saved = 0;
  let failed = 0;

  for (const { username } of competitors) {
    try {
      const profile = await fetchBusinessDiscovery(igUserId, token, username);
      const posts30 = await fetchRecentPostCount(igUserId, token, username, now - 30 * DAY);
      const media = profile.media?.data ?? [];

      const avg = (key) => {
        const values = media.map((m) => m[key]).filter((v) => typeof v === "number");
        return values.length ? values.reduce((s, v) => s + v, 0) / values.length : null;
      };
      const top = media.reduce((best, m) => (!best || (m.like_count ?? 0) > (best.like_count ?? 0) ? m : best), null);
      const topPost = top
        ? {
            id: top.id,
            permalink: top.permalink,
            thumbnail_url: top.thumbnail_url ?? top.media_url ?? null,
            likes: top.like_count ?? null,
            comments: top.comments_count ?? null,
            timestamp: top.timestamp,
          }
        : null;

      await sql`
        insert into competitor_stats (fb_user_id, username, day, name, picture_url, followers, following, media_count,
                                      posts_30d, avg_likes, avg_comments, top_post)
        values (${userId}, ${username}, current_date, ${profile.name ?? null}, ${profile.profile_picture_url ?? null},
                ${profile.followers_count ?? null}, ${profile.follows_count ?? null}, ${profile.media_count ?? null},
                ${posts30}, ${avg("like_count")}, ${avg("comments_count")}, ${JSON.stringify(topPost)}::jsonb)
        on conflict (fb_user_id, username, day) do update set
          name = excluded.name, picture_url = excluded.picture_url, followers = excluded.followers,
          following = excluded.following, media_count = excluded.media_count, posts_30d = excluded.posts_30d,
          avg_likes = excluded.avg_likes, avg_comments = excluded.avg_comments, top_post = excluded.top_post
      `;
      await recordLookupFollowers(userId, username, profile.followers_count);
      saved++;
    } catch (err) {
      failed++;
      console.error(`Competitor stats failed for ${username}:`, err.message);
    }
  }
  return { saved, failed };
}
