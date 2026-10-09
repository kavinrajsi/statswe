import { NextResponse } from "next/server";
import { normalizeHex } from "@/lib/brand";
import { setBrandColor } from "@/lib/settings";
import { readSession, SESSION_COOKIE } from "@/lib/session";

// Saves the brand colour for the logged-in user. Body: { color: "#rrggbb" } or { color: null } to reset.
export async function PUT(request) {
  const session = await readSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  let color = null;
  if (body.color !== null) {
    color = normalizeHex(body.color);
    if (!color) return NextResponse.json({ error: "invalid_color" }, { status: 400 });
  }

  await setBrandColor(session.userId, color);
  return NextResponse.json({ color });
}
