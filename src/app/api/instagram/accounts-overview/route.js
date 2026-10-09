import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { monthToDate } from "@/app/dashboard/months";
import { fetchAccountSummary, fetchIgProfile, fetchPages } from "@/lib/meta";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// Followers, reach and profile visits for every Instagram account the logged-in user owns. Not stored.
// One account failing leaves its cells empty; it doesn't fail the whole request.
export async function GET(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const mtd = monthToDate();
  const accounts = await sql`
    select a.id, a.username, a.name, a.ig_user_id, a.page_id, u.token_enc
    from ig_accounts a
    join fb_users u on u.id = a.fb_user_id
    where u.id = ${session.userId}
    order by a.username
  `;
  if (accounts.length === 0) return NextResponse.json({ accounts: [] });

  let pages;
  try {
    // Every account of one login shares the same user token
    pages = await fetchPages(decrypt(accounts[0].token_enc));
  } catch (err) {
    console.error("Accounts overview failed:", err);
    return NextResponse.json({ error: "overview_failed" }, { status: 502 });
  }

  const rows = await Promise.all(
    accounts.map(async (a) => {
      const base = { id: a.id, username: a.username, name: a.name, pictureUrl: null };
      const page = pages.find((p) => p.id === a.page_id);
      if (!page?.access_token) {
        return { ...base, followers: null, reach: null, profileViews: null, error: "no_page_token" };
      }

      const [profile, summary] = await Promise.all([
        fetchIgProfile(a.ig_user_id, page.access_token).catch(() => null),
        fetchAccountSummary(a.ig_user_id, page.access_token, mtd.sinceSec),
      ]);
      return {
        ...base,
        name: profile?.name ?? a.name,
        pictureUrl: profile?.profile_picture_url ?? null,
        followers: profile?.followers_count ?? null,
        reach: summary.reach,
        profileViews: summary.profileViews,
        error: profile ? null : "profile_failed",
      };
    })
  );

  return NextResponse.json({ accounts: rows });
}
