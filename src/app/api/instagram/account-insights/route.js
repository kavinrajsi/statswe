import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { monthEnds } from "@/app/dashboard/months";
import { fetchAccountInsights, fetchFollowerPoints, fetchIgProfile, fetchPages } from "@/lib/meta";
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
    // Current follower total anchors the growth chart; if it fails the chart is just hidden
    const [insights, profile] = await Promise.all([
      fetchAccountInsights(row.ig_user_id, page.access_token),
      fetchIgProfile(row.ig_user_id, page.access_token).catch(() => null),
    ]);
    const followers = profile?.followers_count ?? null;
    // Month-end totals for the last 12 months. Null if Meta has no follower history for this account.
    const followerMonths =
      followers === null
        ? null
        : await fetchFollowerPoints(row.ig_user_id, page.access_token, followers)
            .then((points) => monthEnds(points, 12))
            .catch(() => null);
    return NextResponse.json({ ...insights, followers, followerMonths });
  } catch (err) {
    console.error("Account insights failed:", err);
    return NextResponse.json({ error: "insights_failed" }, { status: 502 });
  }
}
