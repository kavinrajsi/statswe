// Facebook Login for Business + Instagram Graph API.
// The IG account must be a Business/Creator account linked to a Facebook Page.
// Tokens are sent as Bearer headers so they don't end up in logs.

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
export async function fetchAccountInsights(igUserId, pageToken, days = 30) {
  const until = Math.floor(Date.now() / 1000);
  const since = until - days * 86400;
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

  let views = null;
  try {
    const json = await getJson(
      `${GRAPH}/${igUserId}/insights?metric=views&metric_type=total_value&period=day&${window}`,
      pageToken
    );
    views = json.data?.[0]?.total_value?.value ?? null;
  } catch (err) {
    error ??= err.message;
  }

  const series = Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  return { days: series, views, error };
}
