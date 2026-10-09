import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { fetchOnlineFollowers, fetchPages } from "@/lib/meta";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// When followers are online: 24 hourly counts for each weekday (Mon..Sun), summed over the last 30 days. Times are IST.
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
    if (!page?.access_token) return NextResponse.json({ error: "no_page_token" }, { status: 502 });

    const days = await fetchOnlineFollowers(row.ig_user_id, page.access_token);
    if (days === null) return NextResponse.json({ error: "unavailable" }, { status: 502 });

    // Convert UTC to IST (UTC+5:30). A UTC hour covers the second half of one IST hour and the first half of the next,
    // so its count is split evenly between them. byDay[0] = Monday ... byDay[6] = Sunday, each with 24 IST hours.
    const byDay = Array.from({ length: 7 }, () => Array(24).fill(0));
    for (const day of days) {
      const weekday = (new Date(day.end_time).getUTCDay() + 6) % 7;
      day.hours.forEach((count, utcHour) => {
        for (const [offset, share] of [[5, 0.5], [6, 0.5]]) {
          const istHour = utcHour + offset;
          const dayShift = Math.floor(istHour / 24);
          const wd = (weekday + dayShift) % 7;
          byDay[wd][istHour % 24] += count * share;
        }
      });
    }
    for (const row of byDay) for (let h = 0; h < 24; h += 1) row[h] = Math.round(row[h]);
    return NextResponse.json({ days: days.length, byDay, timezone: "IST" });
  } catch (err) {
    console.error("Active times failed:", err);
    return NextResponse.json({ error: "active_times_failed" }, { status: 502 });
  }
}
