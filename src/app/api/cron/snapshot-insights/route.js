import { NextResponse } from "next/server";
import { snapshotPosts } from "@/lib/snapshots";

// Called daily by Vercel Cron (see vercel.json). Keeps 90 days of per-post snapshots.
export const maxDuration = 300;

export async function GET(request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await snapshotPosts(90));
  } catch (err) {
    console.error("Snapshot run failed:", err);
    return NextResponse.json({ error: "snapshot_failed" }, { status: 500 });
  }
}
