import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_OPTIONS } from "@/lib/supabase/session";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

/**
 * Refreshes the auth session on every request and returns both the response
 * carrying updated cookies and the current user (or null).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            // Persist across browser restarts; see lib/supabase/session.ts.
            response.cookies.set(name, value, { ...options, ...AUTH_COOKIE_OPTIONS })
          );
        },
      },
    }
  );

  // Must be getUser(), not getSession() — getUser revalidates the token with
  // Supabase, so a revoked session cannot slip past the middleware.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, supabase, user };
}
