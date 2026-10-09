import { sql } from "@/lib/db";

export const MAX_COMPETITORS = 10;

// Brand colour for one login ("#rrggbb"), or null for the default theme.
export async function getBrandColor(userId) {
  const [row] = await sql`select brand_color from user_settings where fb_user_id = ${userId}`;
  return row?.brand_color ?? null;
}

export async function setBrandColor(userId, color) {
  await sql`
    insert into user_settings (fb_user_id, brand_color, updated_at)
    values (${userId}, ${color}, now())
    on conflict (fb_user_id) do update set brand_color = excluded.brand_color, updated_at = now()
  `;
}

// Saved competitors with their latest stored follower count.
export async function listCompetitors(userId) {
  return sql`
    select c.username,
           (select s.followers from ig_lookup_followers s
            where s.fb_user_id = c.fb_user_id and s.username = c.username
            order by s.snapshot_date desc limit 1) as followers
    from ig_competitors c
    where c.fb_user_id = ${userId}
    order by c.username
  `;
}

export async function countCompetitors(userId) {
  const [row] = await sql`select count(*)::int as n from ig_competitors where fb_user_id = ${userId}`;
  return row.n;
}

export async function addCompetitor(userId, username) {
  await sql`insert into ig_competitors (fb_user_id, username) values (${userId}, ${username}) on conflict do nothing`;
}

export async function removeCompetitor(userId, username) {
  await sql`delete from ig_competitors where fb_user_id = ${userId} and username = ${username}`;
}
