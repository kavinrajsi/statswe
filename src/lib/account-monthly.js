import { sql } from "@/lib/db";
import { fetchFollowerPoints, fetchMetricTotal } from "@/lib/meta";
import { monthEnds, recentMonthKeys } from "@/app/dashboard/months";

// Last 12 calendar months for one account: followers at month end, unique reach and profile visits.
// Completed months come from ig_account_monthly; the current month is always fetched again.
// A stored month with a gap is retried once it is more than 7 days old.
// Returns [{ month: "YYYY-MM", followers, reach, profileViews }], oldest first. Null means Meta had no data.
export async function getAccountMonthly(igUserId, pageToken, currentFollowers) {
  const keys = recentMonthKeys(12);
  const current = keys[keys.length - 1];

  const stored = await sql`
    select to_char(month, 'YYYY-MM') as month, followers, reach, profile_views,
           fetched_at < now() - interval '7 days' as stale
    from ig_account_monthly
    where ig_user_id = ${igUserId}
  `;
  const byKey = new Map(stored.map((r) => [r.month, r]));

  const needsRefresh = (key) => {
    if (key === current) return true;
    const row = byKey.get(key);
    if (!row) return true;
    const complete = row.followers !== null && row.reach !== null && row.profile_views !== null;
    return !complete && row.stale;
  };
  const refresh = keys.filter(needsRefresh);

  // Month-end followers for past months come from the daily walk-back. Only fetched if a past month needs it.
  const needsPoints = refresh.some((k) => k !== current && (byKey.get(k)?.followers ?? null) === null);
  const pointFollowers = new Map();
  if (needsPoints) {
    const points = await fetchFollowerPoints(igUserId, pageToken, currentFollowers).catch(() => []);
    for (const r of monthEnds(points, 12)) pointFollowers.set(r.month, r.followers);
  }

  const fetched = await Promise.all(
    refresh.map(async (key) => {
      const [y, m] = key.split("-").map(Number);
      const since = Math.floor(Date.UTC(y, m - 1, 1) / 1000);
      const nowSec = Math.floor(Date.now() / 1000);
      const until = Math.min(Math.floor(Date.UTC(y, m, 1) / 1000), nowSec);
      const [reach, profileViews] = await Promise.all([
        fetchMetricTotal(igUserId, pageToken, "reach", since, until),
        fetchMetricTotal(igUserId, pageToken, "profile_views", since, until),
      ]);
      const followers =
        key === current ? currentFollowers : pointFollowers.get(key) ?? byKey.get(key)?.followers ?? null;
      return { month: key, followers, reach, profileViews };
    })
  );

  for (const row of fetched) {
    await sql`
      insert into ig_account_monthly (ig_user_id, month, followers, reach, profile_views, fetched_at)
      values (${igUserId}, ${`${row.month}-01`}, ${row.followers}, ${row.reach}, ${row.profileViews}, now())
      on conflict (ig_user_id, month) do update set
        followers = excluded.followers,
        reach = excluded.reach,
        profile_views = excluded.profile_views,
        fetched_at = now()
    `;
  }

  const freshByKey = new Map(fetched.map((r) => [r.month, r]));
  return keys.map((key) => {
    const row = freshByKey.get(key) ?? byKey.get(key);
    return {
      month: key,
      followers: row?.followers ?? null,
      reach: row?.reach ?? null,
      profileViews: row?.profile_views ?? row?.profileViews ?? null,
    };
  });
}
