import { NextResponse } from "next/server";

// Relative Location header: the browser resolves it against the current origin.
// Using new URL(path, request.url) produced localhost links behind the ngrok tunnel.
export function redirectTo(path, status = 303) {
  return new NextResponse(null, { status, headers: { Location: path } });
}
