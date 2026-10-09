// Facebook Login for Business + Instagram Graph API.
// The IG account must be a Business/Creator account linked to a Facebook Page.
// Tokens are sent as Bearer headers so they don't end up in logs.

import { monthKey } from "@/app/dashboard/months";

const GRAPH = "https://graph.facebook.com/v23.0";

export const SCOPES = [
  "instagram_basic",
  "pages_show_list",
  "pages_read_engagement",
  "business_management",
  "instagram_manage_insights",
];

const MEDIA_FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_product_type",
  "media_url",
  "thumbnail_url",
  "permalink",
  "timestamp",
  "like_count",
  "comments_count",
  "children{media_url,media_type,thumbnail_url}",
].join(",");

export function loginUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.FB_APP_ID,
    redirect_uri: process.env.FB_REDIRECT_URI,
    response_type: "code",
    scope: SCOPES.join(","),
    state,
  });
  return `https://www.facebook.com/v23.0/dialog/oauth?${params}`;
}

async function getJson(url, token) {
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(`Graph API ${res.status}: ${JSON.stringify(json.error ?? json)}`);
  }
  return json;
}

// Authorization code -> short-lived user token
export async function exchangeCode(code) {
  const params = new URLSearchParams({
    client_id: process.env.FB_APP_ID,
    client_secret: process.env.FB_APP_SECRET,
    redirect_uri: process.env.FB_REDIRECT_URI,
    code,
  });
  const json = await getJson(`${GRAPH}/oauth/access_token?${params}`);
  return json.access_token;
}

// Short-lived -> long-lived user token (~60 days). Same call refreshes a long-lived token.
export async function longLivedToken(token) {
  const params = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: process.env.FB_APP_ID,
    client_secret: process.env.FB_APP_SECRET,
    fb_exchange_token: token,
  });
  const json = await getJson(`${GRAPH}/oauth/access_token?${params}`);
  return {
    accessToken: json.access_token,
    expiresIn: json.expires_in ?? 60 * 60 * 24 * 60,
  };
}

export async function fetchProfile(token) {
  return getJson(`${GRAPH}/me?${new URLSearchParams({ fields: "id,name" })}`, token);
}

// Pages the user manages, with their page access token and linked IG Business account.
export async function fetchPages(token) {
  const params = new URLSearchParams({
    fields: "id,name,access_token,instagram_business_account{id,username}",
    limit: "100",
  });
  const pages = [];
  let url = `${GRAPH}/me/accounts?${params}`;
  while (url) {
    const json = await getJson(url, token);
    pages.push(...(json.data ?? []));
    url = json.paging?.next ?? null;
  }
  return pages;
}

// Yields one page of media at a time. Use a Page access token.
// edge: "media" (own posts/reels) or "tags" (media where the account is tagged).
export async function* fetchAllMedia(igUserId, pageToken, edge = "media", limit = 50) {
  const params = new URLSearchParams({ fields: MEDIA_FIELDS, limit: String(limit) });
  let url = `${GRAPH}/${igUserId}/${edge}?${params}`;
  while (url) {
    const json = await getJson(url, pageToken);
    yield json.data ?? [];
    url = json.paging?.next ?? null;
  }
}

// Profile stats for an IG Business/Creator account. Use a Page access token.
export async function fetchIgProfile(igUserId, pageToken) {
  const params = new URLSearchParams({
    fields: "username,name,profile_picture_url,followers_count,follows_count,media_count",
  });
  return getJson(`${GRAPH}/${igUserId}?${params}`, pageToken);
}

const POST_METRICS = ["views", "reach", "saved", "likes", "comments", "shares", "total_interactions"];

// Insights per metric. Each metric is requested alone so one unsupported metric
// doesn't hide the rest. Returns { metrics, followers, error }.
export async function fetchPostInsights(mediaId, pageToken) {
  let error = null;
  const pick = (json) => {
    const item = json.data?.[0];
    return item?.values?.[0]?.value ?? item?.total_value?.value ?? null;
  };

  const metrics = {};
  await Promise.all(
    POST_METRICS.map(async (name) => {
      try {
        const json = await getJson(`${GRAPH}/${mediaId}/insights?metric=${name}`, pageToken);
        metrics[name] = pick(json);
      } catch (err) {
        error ??= err.message;
        metrics[name] = null;
      }
    })
  );

  // Followers vs non-followers split of reach, if Meta provides it for this post
  let followers = null;
  try {
    const json = await getJson(
      `${GRAPH}/${mediaId}/insights?metric=reach&breakdown=follow_type`,
      pageToken
    );
    const results = json.data?.[0]?.total_value?.breakdowns?.[0]?.results ?? [];
    followers = Object.fromEntries(results.map((r) => [r.dimension_values[0], r.value]));
  } catch {
    followers = null;
  }

  return { metrics, followers, error };
}

// Account-level daily series for the last `days` days (max 30 per Meta call).
// reach and follower_count are per-day values; views is a total over the window.
// Daily reach and follower change from sinceSec (unix seconds) until now. Meta serves at most 30 days per call.
export async function fetchAccountInsights(igUserId, pageToken, sinceSec) {
  const until = Math.floor(Date.now() / 1000);
  const since = Math.max(sinceSec, until - 30 * 86400);
  const window = `since=${since}&until=${until}`;
  const byDate = {};
  let error = null;

  await Promise.all(
    ["reach", "follower_count"].map(async (name) => {
      try {
        const json = await getJson(`${GRAPH}/${igUserId}/insights?metric=${name}&period=day&${window}`, pageToken);
        for (const v of json.data?.[0]?.values ?? []) {
          const date = v.end_time.slice(0, 10);
          byDate[date] ??= { date };
          byDate[date][name] = v.value;
        }
      } catch (err) {
        error ??= err.message;
      }
    })
  );

  const series = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  return { days: series, error };
}

const MAX_WINDOW_SEC = 30 * 86400;

// Splits [since, until) into windows Meta accepts (at most 30 days each).
function windowsOf(since, until) {
  const out = [];
  for (let s = since; s < until; s += MAX_WINDOW_SEC) out.push([s, Math.min(s + MAX_WINDOW_SEC, until)]);
  return out;
}

// One insights call per window. A window Meta refuses comes back as null.
async function insightWindows(igUserId, pageToken, query, since, until) {
  return Promise.all(
    windowsOf(since, until).map(([s, e]) =>
      getJson(
        `${GRAPH}/${igUserId}/insights?${query}&metric_type=total_value&period=day&since=${s}&until=${e}`,
        pageToken
      ).catch(() => null)
    )
  );
}

// One metric's total over [since, until] (unix seconds). Null if Meta returns nothing.
// Additive metrics are summed across windows. Reach is unique, so only the first window is used for longer ranges.
export async function fetchMetricTotal(igUserId, pageToken, metric, since, until) {
  const results = await insightWindows(igUserId, pageToken, `metric=${metric}`, since, until);
  const usable = metric === "reach" ? results.slice(0, 1) : results;
  const values = usable.map((json) => json?.data?.[0]?.total_value?.value ?? null);
  if (values.every((v) => v === null)) return null;
  return values.reduce((sum, v) => sum + (v ?? 0), 0);
}

// A metric split by breakdown (e.g. "follow_type,media_product_type"). rows: [{ key: "FOLLOWER/REEL", value }].
// Additive metrics are summed across windows; unique metrics (reach) use the first window only.
export async function fetchInsightBreakdown(igUserId, pageToken, { metric, breakdown, since, until }) {
  const results = await insightWindows(
    igUserId,
    pageToken,
    `metric=${metric}&breakdown=${breakdown}`,
    since,
    until
  );
  const usable = metric === "reach" ? results.slice(0, 1) : results;
  if (usable.every((json) => json === null)) return null;

  let total = 0;
  const sums = new Map();
  for (const json of usable) {
    const tv = json?.data?.[0]?.total_value;
    if (!tv) continue;
    total += tv.value ?? 0;
    for (const r of tv.breakdowns?.[0]?.results ?? []) {
      const key = r.dimension_values.join("/");
      sums.set(key, (sums.get(key) ?? 0) + (r.value ?? 0));
    }
  }
  return { total, rows: [...sums].map(([key, value]) => ({ key, value })) };
}

// Unique reach, views and profile visits from sinceSec (unix seconds) until now. Each metric fails on its own (null).
// reach is Meta's unique reach for the whole window, so it is not the sum of the daily values.
export async function fetchAccountSummary(igUserId, pageToken, sinceSec) {
  const until = Math.floor(Date.now() / 1000);
  const [reach, views, profileViews] = await Promise.all([
    fetchMetricTotal(igUserId, pageToken, "reach", sinceSec, until),
    fetchMetricTotal(igUserId, pageToken, "views", sinceSec, until),
    fetchMetricTotal(igUserId, pageToken, "profile_views", sinceSec, until),
  ]);
  return { reach, views, profileViews };
}

// Daily follower totals for the last `windows` * 30 days, rebuilt from the current count and Meta's daily
// net change. Meta serves follower_count in windows of at most 30 days, so this makes one call per window.
// Windows are read newest first; older windows past Meta's retention fail and are dropped, which keeps the
// totals exact for the days kept. Returns points oldest first.
export async function fetchFollowerPoints(igUserId, pageToken, currentFollowers, windows = 12) {
  const DAY = 86400;
  const now = Math.floor(Date.now() / 1000);
  const ranges = Array.from({ length: windows }, (_, i) => {
    const until = now - i * 30 * DAY;
    return { since: until - 30 * DAY, until };
  });

  const responses = await Promise.all(
    ranges.map(({ since, until }) =>
      getJson(`${GRAPH}/${igUserId}/insights?metric=follower_count&period=day&since=${since}&until=${until}`, pageToken)
        .catch(() => null)
    )
  );

  let contiguous = 0;
  while (contiguous < responses.length && responses[contiguous]) contiguous += 1;
  if (contiguous === 0) throw new Error("No follower_count data");

  const netByDate = new Map();
  for (const json of responses.slice(0, contiguous)) {
    for (const v of json.data?.[0]?.values ?? []) netByDate.set(v.end_time.slice(0, 10), v.value ?? 0);
  }

  const points = [];
  let total = currentFollowers;
  for (const date of [...netByDate.keys()].sort().reverse()) {
    points.unshift({ date, followers: total });
    total -= netByDate.get(date);
  }
  return points;
}

// Public profile + recent media of another Business/Creator account, looked up by username.
// Called with the Page token of one of the logged-in user's IG accounts.
export async function fetchBusinessDiscovery(igUserId, pageToken, username) {
  const media = "media.limit(12){id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count}";
  const fields = `business_discovery.username(${username}){username,name,biography,profile_picture_url,followers_count,follows_count,media_count,${media}}`;
  const json = await getJson(`${GRAPH}/${igUserId}?fields=${encodeURIComponent(fields)}`, pageToken);
  return json.business_discovery;
}

const MONTHLY_PAGE_CAP = 10;

// Post counts per UTC month for another account, from pages of 50 posts (newest first).
// Stops once a page reaches posts older than sinceDate. If MONTHLY_PAGE_CAP runs out first,
// coveredFrom is the month of the oldest post fetched: that month and earlier are incomplete. Otherwise null.
export async function fetchBusinessDiscoveryMonthly(igUserId, pageToken, username, sinceDate) {
  const counts = new Map();
  let after = null;
  let oldestFetched = null;

  for (let page = 0; page < MONTHLY_PAGE_CAP; page += 1) {
    const cursor = after ? `.after(${after})` : "";
    const media = `media.limit(50)${cursor}{timestamp}`;
    const fields = `business_discovery.username(${username}){${media}}`;
    const json = await getJson(`${GRAPH}/${igUserId}?fields=${encodeURIComponent(fields)}`, pageToken);
    const edge = json.business_discovery?.media;
    const posts = edge?.data ?? [];

    for (const post of posts) {
      const date = new Date(post.timestamp);
      if (date >= sinceDate) {
        const key = monthKey(date);
        counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }

    const oldest = posts.length ? new Date(posts[posts.length - 1].timestamp) : null;
    if (oldest) oldestFetched = oldest;
    // Graph returns cursors.after without a `next` URL for this nested edge
    const done = !oldest || oldest < sinceDate || !edge?.paging?.cursors?.after;
    if (done) return { months: toMonthList(counts), coveredFrom: null };
    after = edge.paging.cursors.after;
  }

  return { months: toMonthList(counts), coveredFrom: oldestFetched ? monthKey(oldestFetched) : null };
}

function toMonthList(counts) {
  return [...counts].map(([month, total]) => ({ month, total }));
}

// Current follower count of another account, for the daily lookup snapshots. Null if Meta doesn't return one.
export async function fetchBusinessDiscoveryFollowers(igUserId, pageToken, username) {
  const fields = `business_discovery.username(${username}){followers_count}`;
  const json = await getJson(`${GRAPH}/${igUserId}?fields=${encodeURIComponent(fields)}`, pageToken);
  return json.business_discovery?.followers_count ?? null;
}
