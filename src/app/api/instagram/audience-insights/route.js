import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { getAudienceInsights } from "@/lib/audience";
import { fetchPages } from "@/lib/meta";
import { readSession, SESSION_COOKIE } from "@/lib/session";

const PERIODS = new Set(["30d", "mtd", "prev"]);

// Views, viewers and interactions for one IG account the logged-in user owns, for the chosen period. Not stored.
export async function GET(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get("account");
  if (!accountId) return NextResponse.json({ error: "missing_account" }, { status: 400 });
  const period = PERIODS.has(searchParams.get("period")) ? searchParams.get("period") : "30d";

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

    return NextResponse.json({ period, ...(await getAudienceInsights(row.ig_user_id, page.access_token, period)) });
  } catch (err) {
    console.error("Audience insights failed:", err);
    return NextResponse.json({ error: "insights_failed" }, { status: 502 });
  }
}
