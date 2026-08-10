import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Three portals, one deployment.
 *
 *   sportsconnect.ae            → /            (consumer)
 *   organizer.sportsconnect.ae  → /organizer/* (Event Admin)
 *   admin.sportsconnect.ae      → /admin/*     (Super Admin)
 *
 * Subdomains are *rewritten* onto path prefixes so the same routes also work
 * on localhost and Vercel preview URLs, where subdomains aren't available.
 */

const ORGANIZER_HOST = process.env.NEXT_PUBLIC_ORGANIZER_HOST ?? "organizer.sportsconnect.ae";
const ADMIN_HOST = process.env.NEXT_PUBLIC_ADMIN_HOST ?? "admin.sportsconnect.ae";

/** Paths reachable without a session. Everything else requires one. */
const PUBLIC_PREFIXES = [
  "/", // marketing landing
  "/home", // consumer app home — browsable without an account
  "/e/", // shared event link — must work for a cold visitor
  "/events",
  "/explore",
  "/sports",
  "/search",
  "/login",
  "/signup",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/auth/", // Supabase callback routes
  "/legal",
  "/venues", // Coming Soon teaser
  "/no-access", // the denial page itself must never require a session
];

function isPublic(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PREFIXES.some((p) => p !== "/" && pathname.startsWith(p));
}

export async function middleware(request: NextRequest) {
  const url = request.nextUrl.clone();
  const host = (request.headers.get("host") ?? "").split(":")[0].toLowerCase();

  // --- 1. Map subdomain → path prefix ---------------------------------------
  let portal: "consumer" | "organizer" | "admin" = "consumer";

  if (host === ORGANIZER_HOST) {
    portal = "organizer";
    if (!url.pathname.startsWith("/organizer")) {
      url.pathname = `/organizer${url.pathname === "/" ? "" : url.pathname}`;
    }
  } else if (host === ADMIN_HOST) {
    portal = "admin";
    if (!url.pathname.startsWith("/admin")) {
      url.pathname = `/admin${url.pathname === "/" ? "" : url.pathname}`;
    }
  } else if (url.pathname.startsWith("/organizer")) {
    portal = "organizer";
  } else if (url.pathname.startsWith("/admin")) {
    portal = "admin";
  }

  const rewritten = url.pathname !== request.nextUrl.pathname;

  // --- 2. Refresh the session ------------------------------------------------
  const { response, supabase, user } = await updateSession(request);

  // --- 3. Signed-in visitors skip the marketing page ------------------------
  // Someone with an account almost never wants the pitch; send them to the app.
  if (user && portal === "consumer" && request.nextUrl.pathname === "/") {
    const home = request.nextUrl.clone();
    home.pathname = "/home";
    return NextResponse.redirect(home);
  }

  // --- 4. Authorise ----------------------------------------------------------
  const needsAuth = portal !== "consumer" || !isPublic(request.nextUrl.pathname);

  if (needsAuth && !user) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }

  if (user && portal !== "consumer") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, status")
      .eq("id", user.id)
      .single();

    const role = profile?.role;
    const active = profile?.status === "active";

    const allowed =
      active &&
      (portal === "admin"
        ? role === "super_admin"
        : role === "event_admin" || role === "super_admin");

    if (!allowed) {
      const denied = request.nextUrl.clone();
      denied.pathname = "/no-access";
      denied.search = "";
      return NextResponse.rewrite(denied, { headers: response.headers });
    }
  }

  if (rewritten) {
    return NextResponse.rewrite(url, { headers: response.headers });
  }
  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals and static assets.
    "/((?!_next/static|_next/image|favicon.ico|covers/|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|txt|xml|woff2?)$).*)",
  ],
};
