import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { fetchBusinessDiscovery, fetchPages } from "@/lib/meta";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// Looks up a public Business/Creator account by username. Nothing is stored.
export async function GET(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const username = (searchParams.get("username") ?? "").trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(username)) {
    return NextResponse.json({ error: "invalid_username" }, { status: 400 });
  }

  // Use one of the user's linked IG accounts to make the lookup
  const [row] = await sql`
    select a.ig_user_id, a.page_id, u.token_enc
    from ig_accounts a join fb_users u on u.id = a.fb_user_id
    where u.id = ${session.userId}
    order by a.username
    limit 1
  `;
  if (!row) return NextResponse.json({ error: "no_account" }, { status: 404 });

  try {
    const pages = await fetchPages(decrypt(row.token_enc));
    const page = pages.find((p) => p.id === row.page_id);
    if (!page?.access_token) return NextResponse.json({ error: "no_page_token" }, { status: 502 });

    const profile = await fetchBusinessDiscovery(row.ig_user_id, page.access_token, username);
    return NextResponse.json({ profile });
  } catch (err) {
    const message = String(err.message);
    // 2207013: username not found. Personal or private accounts return "Invalid parameter" (code 100).
    if (message.includes("2207013") || message.includes("Invalid parameter") || message.includes("\"code\":100")) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    console.error("Lookup failed:", err);
    return NextResponse.json({ error: "lookup_failed" }, { status: 502 });
  }
}
