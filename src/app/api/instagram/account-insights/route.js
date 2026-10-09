import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { getAccountMonthly } from "@/lib/account-monthly";
import { monthToDate } from "@/app/dashboard/months";
import { fetchAccountInsights, fetchAccountSummary, fetchIgProfile, fetchPages } from "@/lib/meta";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// Daily account insights for one IG account the logged-in user owns. Not stored.
export async function GET(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const accountId = new URL(request.url).searchParams.get("account");
  if (!accountId) return NextResponse.json({ error: "missing_account" }, { status: 400 });

  const [row] = await sql`
    select a.ig_user_id, a.page_id, u.token_enc
    from ig_accounts a
    join fb_users u on u.id = a.fb_user_id
    where a.id = ${accountId} and u.id = ${session.userId}
  `;
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const pages = await fetchPages(decrypt(row.token_enc));
    const page = pages.find((p) => p.id === row.page_id);
    if (!page?.access_token) {
      return NextResponse.json({ error: "no_page_token" }, { status: 502 });
    }
    const mtd = monthToDate();
    // Daily charts cover the last 30 days, or month to date when asked for it
    const period = new URL(request.url).searchParams.get("period") === "mtd" ? "mtd" : "30d";
    const insightsSince = period === "mtd" ? mtd.sinceSec : Math.floor(Date.now() / 1000) - 30 * 86400;
    // Current follower total anchors the growth chart; if it fails the chart is just hidden
    const [insights, profile, summary] = await Promise.all([
      fetchAccountInsights(row.ig_user_id, page.access_token, insightsSince),
      fetchIgProfile(row.ig_user_id, page.access_token).catch(() => null),
      fetchAccountSummary(row.ig_user_id, page.access_token, mtd.sinceSec),
    ]);
    const followers = profile?.followers_count ?? null;
    // Last 12 months of followers, reach and profile visits. Null if the follower count is unavailable.
    const monthly =
      followers === null
        ? null
        : await getAccountMonthly(row.ig_user_id, page.access_token, followers).catch(() => null);
    return NextResponse.json({
      ...insights,
      followers,
      monthly,
      reachTotal: summary.reach,
      views: summary.views,
      profileViews: summary.profileViews,
      periodStart: mtd.start,
      periodEnd: mtd.end,
      chartPeriod: period,
      chartStart: new Date(insightsSince * 1000).toISOString().slice(0, 10),
      chartEnd: mtd.end,
    });
  } catch (err) {
    console.error("Account insights failed:", err);
    return NextResponse.json({ error: "insights_failed" }, { status: 502 });
  }
}
