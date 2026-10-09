import { sql } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { fetchPages, fetchDailySeries, fetchDemographics, fetchMetricTotal, fetchOnlineFollowers } from "@/lib/meta";
import { getAudienceInsights, periodWindows } from "@/lib/audience";
import { numericCountry, resolveCities } from "@/lib/geo";
import { getAccountMonthly } from "@/lib/account-monthly";
import { syncUser } from "@/lib/sync";
import { snapshotPosts } from "@/lib/snapshots";
import { captureStories } from "@/lib/stories";
import { storeCompetitorStats } from "@/lib/competitors";

const DAILY_DAYS = 90;
const DAY = 86400;
const PERIODS = ["30d", "mtd", "prev"];

// Syncs everything the dashboard shows for one login: posts, daily metrics, period summaries, demographics,
// active times, monthly totals, post snapshots and stories. Each step is independent: a failing step is
// recorded and the rest still run. Returns { ok, failures }.
export async function syncLogin(userId) {
  const failures = [];
  const step = async (label, fn) => {
    try {
      await fn();
    } catch (err) {
      failures.push(`${label}: ${err.message}`);
      console.error(`Sync ${label} failed for ${userId}:`, err);
    }
  };

  await step("posts", () => syncUser(userId));

  const accounts = await sql`
    select a.id, a.ig_user_id, a.page_id, a.followers_count, u.token_enc
    from ig_accounts a
    join fb_users u on u.id = a.fb_user_id
    where u.id = ${userId}
  `;
  const pages = accounts.length ? await fetchPages(decrypt(accounts[0].token_enc)).catch(() => []) : [];

  for (const account of accounts) {
    const page = pages.find((p) => p.id === account.page_id);
    if (!page?.access_token) {
      failures.push(`account ${account.ig_user_id}: no page token`);
      continue;
    }
    const token = page.access_token;
    const igUserId = account.ig_user_id;

    await step("daily", () => storeDaily(igUserId, token));
    await step("summaries", () => storeSummaries(igUserId, token));
    await step("demographics", () => storeDemographics(igUserId, token));
    await step("active times", () => storeActiveTimes(igUserId, token));
    await step("monthly", () => getAccountMonthly(igUserId, token, account.followers_count ?? 0));
  }

  // Competitors use the first linked account's token, as the username lookup does
  const first = accounts[0];
  const firstPage = first ? pages.find((p) => p.id === first.page_id) : null;
  if (firstPage?.access_token) {
    await step("competitors", async () => {
      await storeCompetitorStats(userId, first.ig_user_id, firstPage.access_token);
      await sql`delete from competitor_stats where day < current_date - 400`;
    });
  }

  await step("post snapshots", () => snapshotPosts(90, userId));
  await step("stories", () => captureStories(90, userId));

  await sql`
    insert into sync_runs (fb_user_id, last_synced_at, status, message)
    values (${userId}, now(), ${failures.length ? "partial" : "ok"}, ${failures.length ? failures.join("; ") : null})
    on conflict (fb_user_id) do update set last_synced_at = now(), status = excluded.status, message = excluded.message
  `;
  return { ok: failures.length === 0, failures };
}

// Daily reach, views, profile visits and follower change for the last 90 days.
async function storeDaily(igUserId, token) {
  const since = Math.floor(Date.now() / 1000) - DAILY_DAYS * DAY;
  const [reach, views, profile, followers] = await Promise.all(
    ["reach", "views", "profile_views", "follower_count"].map((m) => fetchDailySeries(igUserId, token, m, since))
  );
  const days = new Set([...reach.keys(), ...views.keys(), ...profile.keys(), ...followers.keys()]);
  for (const day of days) {
    await sql`
      insert into account_daily (ig_user_id, day, reach, views, profile_views, follower_net)
      values (${igUserId}, ${day}::date, ${reach.get(day) ?? null}, ${views.get(day) ?? null},
              ${profile.get(day) ?? null}, ${followers.get(day) ?? null})
      on conflict (ig_user_id, day) do update set
        reach = excluded.reach, views = excluded.views,
        profile_views = excluded.profile_views, follower_net = excluded.follower_net
    `;
  }
}

// Audience totals for the 30-day, this-month and previous-month windows, plus profile visits and accounts engaged.
async function storeSummaries(igUserId, token) {
  const now = Math.floor(Date.now() / 1000);
  for (const period of PERIODS) {
    const w = periodWindows(period);
    const [audience, profileViews] = await Promise.all([
      getAudienceInsights(igUserId, token, period),
      fetchMetricTotal(igUserId, token, "profile_views", w.since, w.until),
    ]);
    await saveSummary(igUserId, period, { audience, profileViews });
  }
  const engaged = {};
  for (const n of [7, 14, 30]) {
    engaged[n] = await fetchMetricTotal(igUserId, token, "accounts_engaged", now - n * DAY, now);
  }
  await saveSummary(igUserId, "engaged", engaged);
}

async function saveSummary(igUserId, period, data) {
  await sql`
    insert into account_summary (ig_user_id, period, data, synced_at)
    values (${igUserId}, ${period}, ${JSON.stringify(data)}::jsonb, now())
    on conflict (ig_user_id, period) do update set data = excluded.data, synced_at = now()
  `;
}

// The demographics shown on the dashboard, in the shape the route returns.
export async function buildDemographics(igUserId, token) {
  const ask = (metric, timeframe, breakdown) => fetchDemographics(igUserId, token, { metric, timeframe, breakdown });
  const [fAge, fCountry, fCity, rAge, rCountry, rCity] = await Promise.all([
    ask("follower_demographics", "last_90_days", "age"),
    ask("follower_demographics", "last_90_days", "country"),
    ask("follower_demographics", "last_90_days", "city"),
    ask("reached_audience_demographics", "this_month", "age"),
    ask("reached_audience_demographics", "this_month", "country"),
    ask("reached_audience_demographics", "this_month", "city"),
  ]);

  const topCities = (rows) => [...(rows ?? [])].sort((a, b) => b.value - a.value).slice(0, 10);
  const geo = await resolveCities([...topCities(fCity), ...topCities(rCity)].map((r) => r.key));
  const withGeo = (rows) =>
    rows?.map((r) => {
      const point = geo.get(r.key);
      return point ? { ...r, lat: point.lat, lon: point.lon } : r;
    });
  const withNumeric = (rows) => rows?.map((r) => ({ ...r, numeric: numericCountry(r.key) }));

  return {
    followers: { period: "Last 90 days", age: fAge, country: withNumeric(fCountry), city: withGeo(fCity) },
    reached: { period: "This month", age: rAge, country: withNumeric(rCountry), city: withGeo(rCity) },
  };
}

async function storeDemographics(igUserId, token) {
  const data = await buildDemographics(igUserId, token);
  for (const audience of ["followers", "reached"]) {
    await sql`
      insert into account_audience (ig_user_id, audience, data, synced_at)
      values (${igUserId}, ${audience}, ${JSON.stringify(data[audience])}::jsonb, now())
      on conflict (ig_user_id, audience) do update set data = excluded.data, synced_at = now()
    `;
  }
}

// Hourly activity of followers per weekday, in IST. Same conversion the dashboard used.
export async function buildActiveTimes(igUserId, token) {
  const days = await fetchOnlineFollowers(igUserId, token);
  if (days === null) return null;
  const byDay = Array.from({ length: 7 }, () => Array(24).fill(0));
  for (const day of days) {
    const weekday = (new Date(day.end_time).getUTCDay() + 6) % 7;
    day.hours.forEach((count, utcHour) => {
      for (const [offset, share] of [[5, 0.5], [6, 0.5]]) {
        const istHour = utcHour + offset;
        const dayShift = Math.floor(istHour / 24);
        byDay[(weekday + dayShift) % 7][istHour % 24] += count * share;
      }
    });
  }
  for (const row of byDay) for (let h = 0; h < 24; h += 1) row[h] = Math.round(row[h]);
  return { days: days.length, byDay, timezone: "IST" };
}

async function storeActiveTimes(igUserId, token) {
  const data = await buildActiveTimes(igUserId, token);
  if (!data) return;
  await sql`
    insert into account_activity (ig_user_id, data, synced_at)
    values (${igUserId}, ${JSON.stringify(data)}::jsonb, now())
    on conflict (ig_user_id) do update set data = excluded.data, synced_at = now()
  `;
}
