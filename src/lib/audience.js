import { fetchInsightBreakdown, fetchMetricTotal } from "@/lib/meta";

const DAY = 86400;

// Content type groups shown in the dashboard. Meta's media_product_type values map onto them.
const GROUP_OF = {
  REEL: "reels",
  POST: "posts",
  CAROUSEL_CONTAINER: "posts",
  CAROUSEL_ALBUM: "posts",
  STORY: "stories",
  AD: "ads",
};
const EMPTY_GROUPS = () => ({ reels: 0, posts: 0, stories: 0, ads: 0 });

// Current window for a period, plus the window of the same length right before it (for % change).
// "30d" = last 30 days, "mtd" = this month to date, "prev" = previous calendar month. All UTC, unix seconds.
export function periodWindows(period, now = Date.now()) {
  const nowSec = Math.floor(now / 1000);
  const d = new Date(now);
  const thisMonth = Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / 1000);
  let since;
  let until = nowSec;
  if (period === "mtd") {
    since = Math.min(thisMonth, nowSec - DAY);
  } else if (period === "prev") {
    since = Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1) / 1000);
    until = thisMonth;
  } else {
    since = nowSec - 30 * DAY;
  }
  const length = until - since;
  return { since, until, prevSince: since - length, prevUntil: since };
}

// Views, viewers and interactions for one account and period. Any part Meta refuses comes back as null.
export async function getAudienceInsights(igUserId, pageToken, period) {
  const w = periodWindows(period);
  const days = Math.round((w.until - w.since) / DAY);
  const approximate = days > 30;

  const [views, reach, reachPrev, interactions, interactionsByType] = await Promise.all([
    fetchInsightBreakdown(igUserId, pageToken, {
      metric: "views",
      breakdown: "follow_type,media_product_type",
      since: w.since,
      until: w.until,
    }),
    fetchInsightBreakdown(igUserId, pageToken, {
      metric: "reach",
      breakdown: "follow_type",
      since: w.since,
      until: w.until,
    }),
    fetchMetricTotal(igUserId, pageToken, "reach", w.prevSince, w.prevUntil),
    fetchMetricTotal(igUserId, pageToken, "total_interactions", w.since, w.until),
    fetchInsightBreakdown(igUserId, pageToken, {
      metric: "total_interactions",
      breakdown: "media_product_type",
      since: w.since,
      until: w.until,
    }),
  ]);

  // Views rows look like "FOLLOWER/REEL". Split them by follower type and by content type.
  const viewRows = views?.rows ?? [];
  const bucketsFor = (follow) => {
    const out = EMPTY_GROUPS();
    for (const { key, value } of viewRows) {
      const [f, media] = key.split("/");
      if (follow && f !== follow) continue;
      const group = GROUP_OF[media];
      if (group) out[group] += value;
    }
    return out;
  };
  const allTypes = bucketsFor(null);
  const allTypesSum = Object.values(allTypes).reduce((a, b) => a + b, 0);
  const followerViews = viewRows.filter((r) => r.key.startsWith("FOLLOWER/")).reduce((s, r) => s + r.value, 0);
  const nonFollowerViews = viewRows.filter((r) => r.key.startsWith("NON_FOLLOWER/")).reduce((s, r) => s + r.value, 0);

  const reachRows = reach?.rows ?? [];
  const reachFollowers = reachRows.find((r) => r.key === "FOLLOWER")?.value ?? null;
  const reachNonFollowers = reachRows.find((r) => r.key === "NON_FOLLOWER")?.value ?? null;

  // Interactions rows look like "REEL". Meta gives no follower split for interactions.
  const interactionTypes = EMPTY_GROUPS();
  for (const { key, value } of interactionsByType?.rows ?? []) {
    const group = GROUP_OF[key];
    if (group) interactionTypes[group] += value;
  }

  const changePct =
    reach?.total != null && reachPrev != null && reachPrev > 0 ? ((reach.total - reachPrev) / reachPrev) * 100 : null;

  return {
    range: { start: isoDay(w.since), end: isoDay(w.until - 1) },
    days,
    approximate,
    views: {
      total: views?.total ?? null,
      followers: views ? followerViews : null,
      nonFollowers: views ? nonFollowerViews : null,
      adsPct: allTypesSum > 0 ? (allTypes.ads / allTypesSum) * 100 : null,
      byType: {
        all: allTypes,
        followers: bucketsFor("FOLLOWER"),
        nonFollowers: bucketsFor("NON_FOLLOWER"),
      },
    },
    viewers: {
      total: reach?.total ?? null,
      followers: reachFollowers,
      nonFollowers: reachNonFollowers,
      previous: reachPrev,
      changePct,
    },
    interactions: {
      total: interactions,
      byType: interactionsByType ? interactionTypes : null,
    },
  };
}

function isoDay(sec) {
  return new Date(sec * 1000).toISOString().slice(0, 10);
}
