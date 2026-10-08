import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { fetchPages, fetchPostInsights } from "@/lib/meta";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// Insights for one post. Only posts that belong to the logged-in user are returned.
export async function GET(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const postId = new URL(request.url).searchParams.get("post");
  if (!postId) return NextResponse.json({ error: "missing_post" }, { status: 400 });

  const [row] = await sql`
    select p.ig_id, a.page_id, u.token_enc
    from ig_posts p
    join ig_accounts a on a.id = p.account_id
    join fb_users u on u.id = a.fb_user_id
    where p.ig_id = ${postId} and u.id = ${session.userId}
  `;
  if (!row) return NextResponse.json({ error: "not_found" }, { status: 404 });

  try {
    const pages = await fetchPages(decrypt(row.token_enc));
    const page = pages.find((p) => p.id === row.page_id);
    if (!page?.access_token) {
      return NextResponse.json({ error: "no_page_token" }, { status: 502 });
    }
    return NextResponse.json(await fetchPostInsights(row.ig_id, page.access_token));
  } catch (err) {
    console.error("Insights failed:", err);
    return NextResponse.json({ error: "insights_failed" }, { status: 502 });
  }
}
