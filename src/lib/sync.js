import { sql } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { fetchAllMedia, fetchIgProfile, fetchPages } from "@/lib/meta";

// Pulls posts for every IG account linked to this user and upserts into ig_posts.
export async function syncUser(userId) {
  const [user] = await sql`select token_enc from fb_users where id = ${userId}`;
  if (!user) throw new Error(`Unknown user ${userId}`);

  const pages = await fetchPages(decrypt(user.token_enc));
  const accounts = await sql`
    select id, page_id, ig_user_id from ig_accounts where fb_user_id = ${userId}
  `;

  for (const account of accounts) {
    const page = pages.find((p) => p.id === account.page_id);
    if (!page?.access_token) {
      console.error(`No page token for IG account ${account.ig_user_id}`);
      continue;
    }
    try {
      const profile = await fetchIgProfile(account.ig_user_id, page.access_token);
      await sql`
        update ig_accounts set
          name = ${profile.name ?? null},
          profile_picture_url = ${profile.profile_picture_url ?? null},
          followers_count = ${profile.followers_count ?? null},
          follows_count = ${profile.follows_count ?? null},
          media_count = ${profile.media_count ?? null}
        where id = ${account.id}
      `;
    } catch (err) {
      // Profile stats are cosmetic; don't block post sync on them
      console.error(`Profile fetch failed for ${account.ig_user_id}:`, err);
    }
    await syncAccount(account.id, account.ig_user_id, page.access_token, "media", "own");
    try {
      await syncAccount(account.id, account.ig_user_id, page.access_token, "tags", "tagged");
    } catch (err) {
      // Tagged media needs extra access on some apps; keep the rest of the sync
      console.error(`Tagged sync failed for ${account.ig_user_id}:`, err);
    }
  }
}

async function syncAccount(accountId, igUserId, pageToken, edge, source) {
  for await (const page of fetchAllMedia(igUserId, pageToken, edge)) {
    if (page.length === 0) continue;
    await sql.transaction(
      page.map(
        (p) => sql`
          insert into ig_posts (
            ig_id, account_id, caption, media_type, media_url, thumbnail_url,
            permalink, ts, like_count, comments_count, children,
            media_product_type, source
          ) values (
            ${p.id}, ${accountId}, ${p.caption ?? null}, ${p.media_type},
            ${p.media_url ?? null}, ${p.thumbnail_url ?? null}, ${p.permalink},
            ${p.timestamp}, ${p.like_count ?? null}, ${p.comments_count ?? null},
            ${p.children ? JSON.stringify(p.children.data) : null}::jsonb,
            ${p.media_product_type ?? null}, ${source}
          )
          on conflict (ig_id) do update set
            caption = excluded.caption,
            media_url = excluded.media_url,
            thumbnail_url = excluded.thumbnail_url,
            like_count = excluded.like_count,
            comments_count = excluded.comments_count,
            children = excluded.children,
            media_product_type = excluded.media_product_type,
            source = excluded.source
        `
      )
    );
  }

  await sql`update ig_accounts set last_synced_at = now() where id = ${accountId}`;
}
