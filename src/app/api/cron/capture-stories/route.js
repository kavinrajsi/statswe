import { NextResponse } from "next/server";
import { captureStories } from "@/lib/stories";

// Called by Vercel Cron (see vercel.json). Saves the stories that are live now.
export const maxDuration = 300;

export async function GET(request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(await captureStories(90));
  } catch (err) {
    console.error("Story capture run failed:", err);
    return NextResponse.json({ error: "capture_failed" }, { status: 500 });
  }
}
