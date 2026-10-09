import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { fetchPages } from "@/lib/meta";
import { storeCompetitorStats } from "@/lib/competitors";
import { readSession, SESSION_COOKIE } from "@/lib/session";

export const maxDuration = 300;

// Refreshes the stats of the logged-in user's saved competitors only. Quick compared with a full sync.
export async function POST(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [row] = await sql`
    select a.ig_user_id, a.page_id, u.token_enc
    from ig_accounts a
    join fb_users u on u.id = a.fb_user_id
    where u.id = ${session.userId}
    order by a.username
    limit 1
  `;
  if (!row) return NextResponse.json({ error: "no_account" }, { status: 404 });

  try {
    const pages = await fetchPages(decrypt(row.token_enc));
    const page = pages.find((p) => p.id === row.page_id);
    if (!page?.access_token) return NextResponse.json({ error: "no_page_token" }, { status: 502 });

    return NextResponse.json(await storeCompetitorStats(session.userId, row.ig_user_id, page.access_token));
  } catch (err) {
    console.error("Competitor refresh failed:", err);
    return NextResponse.json({ error: "refresh_failed" }, { status: 502 });
  }
}
