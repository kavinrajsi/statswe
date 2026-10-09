import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { loadContent, METRICS, RANGES, SORTS, TYPES } from "@/lib/content-insights";
import { fetchMetricTotal, fetchPages } from "@/lib/meta";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// Content list for one account: filter by type, date range (publish date), metric and sort.
// Accounts engaged is account-wide, so it comes back as a total for the range (capped at 30 days by Meta).
export async function GET(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const accountId = params.get("account");
  if (!accountId) return NextResponse.json({ error: "missing_account" }, { status: 400 });

  const type = TYPES.includes(params.get("type")) ? params.get("type") : "all";
  const days = RANGES.includes(Number(params.get("range"))) ? Number(params.get("range")) : 7;
  const metric = METRICS.includes(params.get("metric")) ? params.get("metric") : "views";
  const sort = SORTS.includes(params.get("sort")) ? params.get("sort") : "newest";

  const [row] = await sql`
    select a.ig_user_id, a.page_id, u.token_enc
    from ig_accounts a
    join fb_users u on u.id = a.fb_user_id
    where a.id = ${accountId} and u.id = ${session.userId}
  `;
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const { items, earliestSnapshot } = await loadContent({ accountId, userId: session.userId, type, days, metric, sort });

    const pages = await fetchPages(decrypt(row.token_enc));
    const page = pages.find((p) => p.id === row.page_id);
    const engagedDays = Math.min(days, 30);
    const accountsEngaged = page?.access_token
      ? await fetchMetricTotal(
          row.ig_user_id,
          page.access_token,
          "accounts_engaged",
          Math.floor(Date.now() / 1000) - engagedDays * 86400,
          Math.floor(Date.now() / 1000)
        )
      : null;

    return NextResponse.json({ items, type, days, metric, sort, accountsEngaged, engagedDays, earliestSnapshot });
  } catch (err) {
    console.error("Content insights failed:", err);
    return NextResponse.json({ error: "content_failed" }, { status: 502 });
  }
}
