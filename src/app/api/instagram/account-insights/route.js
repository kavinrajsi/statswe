import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { monthToDate, recentMonthKeys } from "@/app/dashboard/months";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// Daily reach and follower change, month-to-date totals and the monthly table for one account. Read from the database.
export async function GET(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const accountId = params.get("account");
  if (!accountId) return NextResponse.json({ error: "missing_account" }, { status: 400 });
  const period = params.get("period") === "mtd" ? "mtd" : "30d";

  const [row] = await sql`
    select a.ig_user_id, a.followers_count
    from ig_accounts a
    join fb_users u on u.id = a.fb_user_id
    where a.id = ${accountId} and u.id = ${session.userId}
  `;
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const mtd = monthToDate();
  const todayIso = new Date().toISOString().slice(0, 10);
  const startIso = period === "mtd" ? mtd.start : new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);

  const days = await sql`
    select to_char(day, 'YYYY-MM-DD') as date, reach, follower_net as follower_count
    from account_daily
    where ig_user_id = ${row.ig_user_id} and day >= ${startIso}::date and day <= ${todayIso}::date
    order by day
  `;
  const [summary] = await sql`select data from account_summary where ig_user_id = ${row.ig_user_id} and period = 'mtd'`;
  const audience = summary?.data?.audience;

  const monthRows = await sql`
    select to_char(month, 'YYYY-MM') as month, followers, reach, profile_views
    from ig_account_monthly
    where ig_user_id = ${row.ig_user_id}
  `;
  const byMonth = new Map(monthRows.map((r) => [r.month, r]));
  const monthly = recentMonthKeys(12).map((m) => {
    const r = byMonth.get(m);
    return { month: m, followers: r?.followers ?? null, reach: r?.reach ?? null, profileViews: r?.profile_views ?? null };
  });

  return NextResponse.json({
    days,
    views: audience?.views?.total ?? null,
    reachTotal: audience?.viewers?.total ?? null,
    profileViews: summary?.data?.profileViews ?? null,
    followers: row.followers_count,
    monthly,
    periodStart: mtd.start,
    periodEnd: mtd.end,
    chartPeriod: period,
    chartStart: startIso,
    chartEnd: todayIso,
    error: summary ? null : "not_synced",
  });
}
