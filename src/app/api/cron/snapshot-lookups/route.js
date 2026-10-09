import { NextResponse } from "next/server";
import { snapshotLookups } from "@/lib/lookup-followers";

// Called daily by Vercel Cron (see vercel.json). Snapshots follower counts of searched usernames.
export const maxDuration = 300;

export async function GET(request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await snapshotLookups(90));
  } catch (err) {
    console.error("Lookup snapshot run failed:", err);
    return NextResponse.json({ error: "snapshot_failed" }, { status: 500 });
  }
}
