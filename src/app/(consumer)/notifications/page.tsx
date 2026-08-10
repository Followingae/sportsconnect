import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyNotifications } from "@/lib/queries/my";
import { isSupabaseConfigured } from "@/lib/env";
import { SetupNotice } from "@/components/setup-notice";
import { EmptyState } from "@/components/ui/feedback";
import { Card, Divider } from "@/components/ui/card";
import { formatRelative } from "@/lib/format";
import { markNotificationsRead } from "@/lib/actions/notifications";
import { cn } from "@/lib/cn";

export const metadata = { title: "Notifications" };
export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/notifications");

  const items = await getMyNotifications(user.id);
  const unread = items.filter((n) => !n.read_at).length;

  return (
    <div>
      <header className="flex items-baseline justify-between gap-3 px-5 pt-4">
        <h1 className="text-h2">Notifications</h1>
        {unread > 0 && (
          <form action={markNotificationsRead}>
            <button type="submit" className="text-[13px] font-bold text-volt-deep">
              Mark all read
            </button>
          </form>
        )}
      </header>

      {items.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={<Bell size={22} />}
          title="Nothing yet"
          body="Registration confirmations, payment updates and event changes will appear here."
          actionLabel="Explore events"
          actionHref="/explore"
        />
      ) : (
        <Card className="mx-5 mt-4 p-0">
          {items.map((n, i) => {
            const body = (
              <div className={cn("flex gap-3 p-4", !n.read_at && "bg-volt-wash/40")}>
                <span
                  aria-hidden
                  className={cn(
                    "mt-1.5 size-2 shrink-0 rounded-full",
                    n.read_at ? "bg-line-strong" : "bg-volt"
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-extrabold">{n.title}</p>
                  {n.body && (
                    <p className="mt-0.5 text-[13px] leading-relaxed text-ink-2">{n.body}</p>
                  )}
                  <p className="mt-1 text-[11.5px] text-ink-3">
                    {formatRelative(n.created_at)}
                  </p>
                </div>
              </div>
            );

            return (
              <div key={n.id}>
                {i > 0 && <Divider className="mx-4" />}
                {n.link ? <Link href={n.link}>{body}</Link> : body}
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
