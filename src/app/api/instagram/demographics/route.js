import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { fetchDemographics, fetchPages } from "@/lib/meta";
import { readSession, SESSION_COOKIE } from "@/lib/session";
import { numericCountry, resolveCities } from "@/lib/geo";

// Age, country and city of the followers (last 90 days) and of the reached audience (this month). Not stored.
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

    const token = page.access_token;
    const ask = (metric, timeframe, breakdown) =>
      fetchDemographics(row.ig_user_id, token, { metric, timeframe, breakdown });

    const [fAge, fCountry, fCity, rAge, rCountry, rCity] = await Promise.all([
      ask("follower_demographics", "last_90_days", "age"),
      ask("follower_demographics", "last_90_days", "country"),
      ask("follower_demographics", "last_90_days", "city"),
      ask("reached_audience_demographics", "this_month", "age"),
      ask("reached_audience_demographics", "this_month", "country"),
      ask("reached_audience_demographics", "this_month", "city"),
    ]);

    // Map data: numeric country ids for the world map, and coordinates for the 10 largest cities of each list
    const topCities = (rows) => [...(rows ?? [])].sort((a, b) => b.value - a.value).slice(0, 10);
    const geo = await resolveCities([...topCities(fCity), ...topCities(rCity)].map((r) => r.key));
    const withGeo = (rows) =>
      rows?.map((r) => {
        const point = geo.get(r.key);
        return point ? { ...r, lat: point.lat, lon: point.lon } : r;
      });
    const withNumeric = (rows) => rows?.map((r) => ({ ...r, numeric: numericCountry(r.key) }));

    return NextResponse.json({
      followers: {
        period: "Last 90 days",
        age: fAge,
        country: withNumeric(fCountry),
        city: withGeo(fCity),
      },
      reached: {
        period: "This month",
        age: rAge,
        country: withNumeric(rCountry),
        city: withGeo(rCity),
      },
    });
  } catch (err) {
    console.error("Demographics failed:", err);
    return NextResponse.json({ error: "demographics_failed" }, { status: 502 });
  }
}
