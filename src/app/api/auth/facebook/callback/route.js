import { after, NextResponse } from "next/server";
import { redirectTo } from "@/lib/redirect";
import { sql } from "@/lib/db";
import { encrypt } from "@/lib/crypto";
import {
  exchangeCode,
  fetchPages,
  fetchProfile,
  longLivedToken,
} from "@/lib/meta";
import { syncUser } from "@/lib/sync";
import {
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
  STATE_COOKIE,
} from "@/lib/session";

function failRedirect(reason) {
  const res = redirectTo(`/?error=${reason}`);
  res.cookies.delete(STATE_COOKIE);
  return res;
}

export async function GET(request) {
  const url = new URL(request.url);

  if (url.searchParams.get("error")) return failRedirect("oauth_denied");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  if (!code || !state || !expectedState || state !== expectedState) {
    return failRedirect("invalid_state");
  }

  let user;
  try {
    const short = await exchangeCode(code);
    const long = await longLivedToken(short);
    const profile = await fetchProfile(long.accessToken);
    const pages = await fetchPages(long.accessToken);
    const expiresAt = new Date(Date.now() + long.expiresIn * 1000);

    [user] = await sql`
      insert into fb_users (fb_user_id, name, token_enc, token_expires_at, status)
      values (${profile.id}, ${profile.name ?? null}, ${encrypt(long.accessToken)}, ${expiresAt}, 'active')
      on conflict (fb_user_id) do update set
        name = excluded.name,
        token_enc = excluded.token_enc,
        token_expires_at = excluded.token_expires_at,
        status = 'active'
      returning id
    `;

    // Only pages with an Instagram Business/Creator account linked are useful
    for (const page of pages.filter((p) => p.instagram_business_account)) {
      const ig = page.instagram_business_account;
      await sql`
        insert into ig_accounts (fb_user_id, page_id, ig_user_id, username)
        values (${user.id}, ${page.id}, ${ig.id}, ${ig.username ?? page.name})
        on conflict (ig_user_id) do update set
          fb_user_id = excluded.fb_user_id,
          page_id = excluded.page_id,
          username = excluded.username
      `;
    }
  } catch (err) {
    console.error("Facebook login failed:", err);
    return failRedirect("oauth_failed");
  }

  const res = redirectTo("/dashboard");
  res.cookies.set(SESSION_COOKIE, await createSession(user.id), sessionCookieOptions);
  res.cookies.delete(STATE_COOKIE);

  // Pull posts after the response is sent so login isn't blocked by pagination
  after(() => syncUser(user.id).catch((err) => console.error("Initial sync failed:", err)));

  return res;
}
