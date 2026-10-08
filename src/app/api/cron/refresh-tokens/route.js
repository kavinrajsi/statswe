import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { decrypt, encrypt } from "@/lib/crypto";
import { longLivedToken } from "@/lib/meta";

// Called by Vercel Cron (see vercel.json). Extends user tokens expiring within 10 days.
export async function GET(request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const due = await sql`
    select id, token_enc from fb_users
    where status = 'active' and token_expires_at < now() + interval '10 days'
  `;

  let refreshed = 0;
  let failed = 0;
  for (const user of due) {
    try {
      const next = await longLivedToken(decrypt(user.token_enc));
      const expiresAt = new Date(Date.now() + next.expiresIn * 1000);
      await sql`
        update fb_users
        set token_enc = ${encrypt(next.accessToken)}, token_expires_at = ${expiresAt}
        where id = ${user.id}
      `;
      refreshed++;
    } catch (err) {
      console.error(`Token refresh failed for ${user.id}:`, err);
      await sql`update fb_users set status = 'needs_reauth' where id = ${user.id}`;
      failed++;
    }
  }

  return NextResponse.json({ checked: due.length, refreshed, failed });
}
