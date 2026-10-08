import { sql } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { fetchPages, fetchPostInsights } from "@/lib/meta";

// Stores one row per post per day with its current insights. Rows older than `days` are deleted.
export async function snapshotPosts(days = 90) {
  const users = await sql`select id, token_enc from fb_users where status = 'active'`;
  let taken = 0;
  let failed = 0;

  for (const user of users) {
    const pages = await fetchPages(decrypt(user.token_enc));
    const accounts = await sql`select id, page_id from ig_accounts where fb_user_id = ${user.id}`;

    for (const account of accounts) {
      const page = pages.find((p) => p.id === account.page_id);
      if (!page?.access_token) continue;

      // Every own post that Meta still serves insights for
      const posts = await sql`
        select ig_id from ig_posts
        where account_id = ${account.id} and source = 'own' and not insights_unavailable
      `;

      for (const post of posts) {
        const { metrics, followers, error } = await fetchPostInsights(post.ig_id, page.access_token);
        const anyValue = Object.values(metrics).some((v) => v !== null);
        if (!anyValue) {
          failed++;
          // 2108006: posted before the account became a business account. Meta never returns insights for it.
          if (error?.includes("2108006")) {
            await sql`update ig_posts set insights_unavailable = true where ig_id = ${post.ig_id}`;
          }
          console.error(`Snapshot failed for ${post.ig_id}: ${error}`);
          continue;
        }
        await sql`
          insert into ig_post_snapshots (ig_id, snapshot_date, metrics, followers)
          values (${post.ig_id}, current_date, ${JSON.stringify(metrics)}::jsonb, ${JSON.stringify(followers)}::jsonb)
          on conflict (ig_id, snapshot_date) do update set
            metrics = excluded.metrics,
            followers = excluded.followers,
            taken_at = now()
        `;
        taken++;
      }
    }
  }

  // Retention: drop anything older than the window
  await sql`delete from ig_post_snapshots where snapshot_date < current_date - ${days}::int`;
  return { taken, failed };
}
