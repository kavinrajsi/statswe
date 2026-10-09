import { sql } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { fetchBusinessDiscoveryFollowers, fetchPages } from "@/lib/meta";

// Public follower counts of searched usernames, one row per logged-in user, username and day.
// Only the count is stored, never captions or media.

// Called on every search. Upserts today's count.
export async function recordLookupFollowers(userId, username, followers) {
  if (followers === null || followers === undefined) return;
  await sql`
    insert into ig_lookup_followers (fb_user_id, username, snapshot_date, followers, source)
    values (${userId}, ${username}, current_date, ${followers}, 'search')
    on conflict (fb_user_id, username, snapshot_date) do update set
      followers = excluded.followers,
      source = excluded.source
  `;
}

// Up to about 13 months, enough for the month-by-month view.
export async function getLookupFollowerHistory(userId, username, days = 400) {
  return sql`
    select to_char(snapshot_date, 'YYYY-MM-DD') as date, followers
    from ig_lookup_followers
    where fb_user_id = ${userId} and username = ${username}
      and snapshot_date >= current_date - ${days}::int
    order by snapshot_date
  `;
}

// Daily cron. Re-snapshots every username that was searched in the last 30 days, so growth
// keeps building without new searches. Same-day search rows are never overwritten.
export async function snapshotLookups(days = 400) {
  const users = await sql`select id, token_enc from fb_users where status = 'active'`;
  let taken = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const pages = await fetchPages(decrypt(user.token_enc));
      // Same account pick as the lookup route
      const [account] = await sql`
        select ig_user_id, page_id from ig_accounts
        where fb_user_id = ${user.id} order by username limit 1
      `;
      const page = pages.find((p) => p.id === account?.page_id);
      if (!account || !page?.access_token) continue;

      const usernames = await sql`
        select distinct username from ig_lookup_followers
        where fb_user_id = ${user.id} and source = 'search'
          and snapshot_date >= current_date - 30
      `;

      for (const { username } of usernames) {
        try {
          const followers = await fetchBusinessDiscoveryFollowers(account.ig_user_id, page.access_token, username);
          if (followers === null) {
            failed++;
            continue;
          }
          await sql`
            insert into ig_lookup_followers (fb_user_id, username, snapshot_date, followers, source)
            values (${user.id}, ${username}, current_date, ${followers}, 'cron')
            on conflict (fb_user_id, username, snapshot_date) do nothing
          `;
          taken++;
        } catch (err) {
          // Account may have gone private or been deleted; skip it and keep going
          failed++;
          console.error(`Lookup snapshot failed for ${username}:`, err.message);
        }
      }
    } catch (err) {
      failed++;
      console.error(`Lookup snapshots failed for user ${user.id}:`, err.message);
    }
  }

  await sql`delete from ig_lookup_followers where snapshot_date < current_date - ${days}::int`;
  return { taken, failed };
}
