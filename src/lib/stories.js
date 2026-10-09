import { sql } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { fetchPages, fetchStories, fetchStoryInsights } from "@/lib/meta";

// Saves every story that is live now, with its latest insights. Stories older than `days` are deleted.
// Meta serves a story for 24 hours only, so this must run often enough to catch each one.
export async function captureStories(days = 90, onlyUserId = null) {
  const users = await sql`select id, token_enc from fb_users where status = 'active' and (${onlyUserId}::uuid is null or id = ${onlyUserId}::uuid)`;
  let saved = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const pages = await fetchPages(decrypt(user.token_enc));
      const accounts = await sql`select id, ig_user_id, page_id from ig_accounts where fb_user_id = ${user.id}`;

      for (const account of accounts) {
        const page = pages.find((p) => p.id === account.page_id);
        if (!page?.access_token) continue;

        const live = await fetchStories(account.ig_user_id, page.access_token);
        if (live === null) {
          failed++;
          continue;
        }

        for (const story of live) {
          const metrics = await fetchStoryInsights(story.id, page.access_token);
          await sql`
            insert into ig_stories (ig_id, account_id, media_type, media_url, thumbnail_url, permalink, ts, metrics, captured_at)
            values (${story.id}, ${account.id}, ${story.media_type ?? null}, ${story.media_url ?? null},
                    ${story.thumbnail_url ?? null}, ${story.permalink ?? null}, ${story.timestamp},
                    ${JSON.stringify(metrics)}::jsonb, now())
            on conflict (ig_id) do update set
              metrics = excluded.metrics,
              captured_at = now()
          `;
          saved++;
        }
      }
    } catch (err) {
      failed++;
      console.error(`Story capture failed for user ${user.id}:`, err.message);
    }
  }

  await sql`delete from ig_stories where ts < now() - ${days}::int * interval '1 day'`;
  return { saved, failed };
}
