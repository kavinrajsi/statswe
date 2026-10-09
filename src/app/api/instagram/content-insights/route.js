import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { loadContent, METRICS, RANGES, SORTS, TYPES } from "@/lib/content-insights";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// Content list for one account: filter by type, date range (publish date), metric and sort.
// Accounts engaged comes from the nightly sync (account-wide, capped at 30 days by Meta).
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
    select a.ig_user_id
    from ig_accounts a
    join fb_users u on u.id = a.fb_user_id
    where a.id = ${accountId} and u.id = ${session.userId}
  `;
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const { items, earliestSnapshot } = await loadContent({ accountId, userId: session.userId, type, days, metric, sort });

    const engagedDays = Math.min(days, 30);
    const [engaged] = await sql`select data from account_summary where ig_user_id = ${row.ig_user_id} and period = 'engaged'`;
    const accountsEngaged = engaged?.data?.[String(engagedDays)] ?? null;

    return NextResponse.json({ items, type, days, metric, sort, accountsEngaged, engagedDays, earliestSnapshot });
  } catch (err) {
    console.error("Content insights failed:", err);
    return NextResponse.json({ error: "content_failed" }, { status: 502 });
  }
}
