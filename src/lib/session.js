import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "ig_session";
export const STATE_COOKIE = "ig_oauth_state";

const SEVEN_DAYS = 60 * 60 * 24 * 7;

const secret = () => new TextEncoder().encode(process.env.SESSION_SECRET);

// userId = fb_users.id
export async function createSession(userId) {
  return new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SEVEN_DAYS}s`)
    .sign(secret());
}

export async function readSession(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload;
  } catch {
    return null;
  }
}

export const cookieOptions = {
  httpOnly: true,
  secure: true,
  sameSite: "lax",
  path: "/",
};

export const sessionCookieOptions = { ...cookieOptions, maxAge: SEVEN_DAYS };
export const stateCookieOptions = { ...cookieOptions, maxAge: 600 };
