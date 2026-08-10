import { createClient } from "@/lib/supabase/server";
import { getUnreadNotificationCount } from "@/lib/queries/my";
import { isSupabaseConfigured } from "@/lib/env";
import { BottomNav } from "@/components/consumer/bottom-nav";
import { TopNav, MobileTopBar } from "@/components/consumer/top-nav";

export const dynamic = "force-dynamic";

/**
 * One shell, two shapes.
 *
 * Phone: the floating bottom bar from the design, content in a single narrow
 * column. Desktop (`lg` and up): a sticky top bar, the bottom bar hidden, and
 * a wide container that the pages fill with responsive grids. The mobile
 * design is preserved exactly where it belongs rather than being stretched
 * across a monitor.
 */
export default async function ConsumerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let signedIn = false;
  let unread = 0;
  let name: string | null = null;

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    signedIn = Boolean(user);

    if (user) {
      const [count, { data: profile }] = await Promise.all([
        getUnreadNotificationCount(user.id),
        supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      ]);
      unread = count;
      name = profile?.full_name ?? user.email ?? null;
    }
  }

  return (
    <div className="min-h-dvh bg-white">
      <TopNav signedIn={signedIn} unread={unread} name={name} />
      <MobileTopBar signedIn={signedIn} unread={unread} />

      {/* Utility classes, not an inline style, so the lg override actually wins
          over the phone's bottom-bar clearance. */}
      <main
        id="main"
        className="mx-auto w-full max-w-[560px] pb-[var(--nav-clearance)] lg:max-w-[1200px] lg:px-8 lg:pb-16 lg:pt-8"
      >
        {children}
      </main>

      <BottomNav />
    </div>
  );
}
