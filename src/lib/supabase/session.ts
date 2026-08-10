import type { CookieOptions } from "@supabase/ssr";

/**
 * Stay-signed-in policy.
 *
 * Supabase issues a short-lived access token (an hour) plus a refresh token
 * that does not expire on its own. What actually ends a session on the web is
 * the *cookie* expiring — by default these are session cookies, so closing the
 * browser signs people out.
 *
 * 400 days is the ceiling: Chrome clamps any cookie expiry beyond that, so
 * asking for longer silently gets truncated. Signing out still clears it
 * immediately, and the middleware revalidates the token with Supabase on every
 * request, so a revoked session dies straight away regardless of the cookie.
 */
export const SESSION_MAX_AGE_DAYS = 400;

export const AUTH_COOKIE_OPTIONS: CookieOptions = {
  maxAge: SESSION_MAX_AGE_DAYS * 24 * 60 * 60,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};
