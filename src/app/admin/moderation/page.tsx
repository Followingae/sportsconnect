import Link from "next/link";
import { Flag, ShieldCheck } from "lucide-react";
import { PortalHeader, PortalBody } from "@/components/portal/shell";
import { createClient } from "@/lib/supabase/server";
import { Panel, KpiTile } from "@/components/ui/card";
import { EventStatusBadge, Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Moderation" };

/**
 * A user-facing reports queue isn't in the MVP data model yet, so moderation
 * surfaces the things that genuinely need a human right now: suspended
 * accounts, suspended events, and events cancelled after taking money.
 */
export default async function ModerationPage() {
  const supabase = await createClient();

  const [suspendedUsers, suspendedEvents, cancelledWithMoney] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, role, status, created_at")
      .eq("status", "suspended"),
    supabase
      .from("events")
      .select("id, name, slug, status, starts_at, sport:sports ( name )")
      .in("status", ["suspended", "rejected"]),
    supabase
      .from("events")
      .select("id, name, slug, status, starts_at, cancellation_reason")
      .eq("status", "cancelled")
      .order("cancelled_at", { ascending: false })
      .limit(10),
  ]);

  const users = suspendedUsers.data ?? [];
  const events = suspendedEvents.data ?? [];
  const cancelled = cancelledWithMoney.data ?? [];
  const clear = users.length === 0 && events.length === 0;

  return (
    <>
      <PortalHeader crumb="Oversight" title="Moderation" />
      <PortalBody>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile label="Suspended accounts" value={users.length} />
          <KpiTile label="Suspended / rejected events" value={events.length} />
          <KpiTile label="Recently cancelled" value={cancelled.length} />
          <KpiTile label="Open reports" value={0} hint="Reporting ships in phase 2" />
        </div>

        {clear && (
          <div className="mt-4 flex items-center gap-3 rounded-panel border border-success-wash bg-success-wash px-4 py-3.5">
            <ShieldCheck size={18} className="text-success" aria-hidden />
            <p className="text-[13.5px] font-semibold text-success">
              Nothing needs moderating. No suspended accounts or events.
            </p>
          </div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Suspended accounts">
            {users.length === 0 ? (
              <EmptyState title="None suspended" />
            ) : (
              <ul className="divide-y divide-line">
                {users.map((u) => (
                  <li key={u.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-danger-wash text-danger">
                      <Flag size={15} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={
                          u.role === "consumer"
                            ? `/admin/consumers/${u.id}`
                            : "/admin/event-admins"
                        }
                        className="block truncate text-[13.5px] font-bold"
                      >
                        {u.full_name || u.email}
                      </Link>
                      <p className="truncate text-[11px] text-ink-3">
                        {u.role.replace("_", " ")} · joined {formatDate(u.created_at)}
                      </p>
                    </div>
                    <Badge tone="danger">Suspended</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Events needing attention">
            {events.length === 0 && cancelled.length === 0 ? (
              <EmptyState title="Nothing flagged" />
            ) : (
              <ul className="divide-y divide-line">
                {[...events, ...cancelled].map((e) => (
                  <li key={e.id} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold">{e.name}</p>
                      <p className="truncate text-[11px] text-ink-3">
                        {formatDate(e.starts_at)}
                        {"cancellation_reason" in e && e.cancellation_reason
                          ? ` · ${e.cancellation_reason}`
                          : ""}
                      </p>
                    </div>
                    <EventStatusBadge status={e.status} dot={false} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <p className="mt-4 text-[11.5px] leading-relaxed text-ink-3">
          Consumer-submitted reports are a phase 2 feature. When they land they will appear
          in this queue alongside the entries above.
        </p>
      </PortalBody>
    </>
  );
}
