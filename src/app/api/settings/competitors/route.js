import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { fetchBusinessDiscoveryFollowers, fetchPages } from "@/lib/meta";
import { recordLookupFollowers } from "@/lib/lookup-followers";
import { addCompetitor, countCompetitors, MAX_COMPETITORS, removeCompetitor } from "@/lib/settings";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// Adds a competitor by Instagram username. It is only saved if Meta returns a public Business or Creator account.
export async function POST(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const username = String(body.username ?? "").trim().replace(/^@/, "").toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(username)) return NextResponse.json({ error: "invalid_username" }, { status: 400 });

  if ((await countCompetitors(session.userId)) >= MAX_COMPETITORS) {
    return NextResponse.json({ error: "too_many", max: MAX_COMPETITORS }, { status: 409 });
  }

  // Same account and token pick as the username lookup
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

    const followers = await fetchBusinessDiscoveryFollowers(row.ig_user_id, page.access_token, username);
    if (followers === null) return NextResponse.json({ error: "not_found" }, { status: 404 });

    await addCompetitor(session.userId, username);
    await recordLookupFollowers(session.userId, username, followers);
    return NextResponse.json({ username, followers });
  } catch (err) {
    // Meta answers with an error for unknown and private accounts
    const message = String(err.message);
    if (message.includes("2207013") || message.includes("Invalid parameter") || message.includes('"code":100')) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    console.error("Add competitor failed:", err);
    return NextResponse.json({ error: "lookup_failed" }, { status: 502 });
  }
}

// Removes a saved competitor. Query: ?username=
export async function DELETE(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const username = (new URL(request.url).searchParams.get("username") ?? "").trim().toLowerCase();
  if (!username) return NextResponse.json({ error: "missing_username" }, { status: 400 });

  await removeCompetitor(session.userId, username);
  return NextResponse.json({ ok: true });
}
