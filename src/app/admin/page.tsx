import Link from "next/link";
import { CheckSquare, Wallet, Undo2, Flag } from "lucide-react";
import { PortalHeader, PortalBody } from "@/components/portal/shell";
import { getPlatformStats, getApprovalQueue, getAllEvents } from "@/lib/queries/admin";
import { createClient } from "@/lib/supabase/server";
import { KpiTile, Panel } from "@/components/ui/card";
import { BarChart } from "@/components/portal/bar-chart";
import { EventStatusBadge } from "@/components/ui/badge";
import { money, moneyCompact, formatDate, formatRelative } from "@/lib/format";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const supabase = await createClient();
  const [stats, queue, events, sportsRes] = await Promise.all([
    getPlatformStats(),
    getApprovalQueue(),
    getAllEvents(),
    supabase.from("sports").select("id, name").order("sort_order"),
  ]);

  const todays = events.filter((e) => {
    const d = new Date(e.starts_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  // --- charts (BRD §19) -----------------------------------------------------
  const months: { label: string; key: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push({
      label: d.toLocaleDateString("en-AE", { month: "short" }),
      key: `${d.getFullYear()}-${d.getMonth()}`,
    });
  }
  const key = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}`;
  };

  const revenueByMonth = months.map((m) => ({
    label: m.label,
    value: stats.raw.payments
      .filter((p) => p.status === "paid" && key(p.created_at) === m.key)
      .reduce((s, p) => s + Number(p.total_amount), 0),
  }));

  const registrationsByMonth = months.map((m) => ({
    label: m.label,
    value: stats.raw.registrations.filter((r) => key(r.registered_at) === m.key).length,
  }));

  const sportList = sportsRes.data ?? [];
  const eventsBySport = sportList.map((s) => ({
    label: s.name.slice(0, 9),
    value: stats.raw.events.filter((e) => e.sport_id === s.id).length,
  }));

  const eventIdToSport = new Map(stats.raw.events.map((e) => [e.id, e.sport_id]));
  const revenueBySport = sportList.map((s) => ({
    label: s.name.slice(0, 9),
    value: stats.raw.payments
      .filter((p) => p.status === "paid" && eventIdToSport.get(p.event_id) === s.id)
      .reduce((sum, p) => sum + Number(p.total_amount), 0),
  }));

  const attention = [
    {
      show: stats.pendingApprovals > 0,
      icon: <CheckSquare size={16} />,
      tone: "bg-volt-wash text-volt-deep",
      title: `${stats.pendingApprovals} event(s) awaiting approval`,
      sub: "Nothing reaches the public until you clear it",
      href: "/admin/approvals",
      cta: "Review",
    },
    {
      show: stats.awaitingVerification > 0,
      icon: <Wallet size={16} />,
      tone: "bg-info-wash text-info",
      title: `${stats.awaitingVerification} payment(s) reported but unverified`,
      sub: "Transfers and cash awaiting your confirmation",
      href: "/admin/payments?status=processing",
      cta: "Reconcile",
    },
    {
      show: stats.refundsOpen > 0,
      icon: <Undo2 size={16} />,
      tone: "bg-warning-wash text-warning",
      title: `${stats.refundsOpen} refund request(s)`,
      sub: `${money(stats.refundsValue)} to decide`,
      href: "/admin/refunds",
      cta: "Decide",
    },
  ].filter((a) => a.show);

  return (
    <>
      <PortalHeader crumb="Overview" title="Dashboard" />
      <PortalBody>
        {/* BRD §19 — eleven KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <KpiTile label="Total events" value={stats.totalEvents} />
          <KpiTile label="Pending approvals" value={stats.pendingApprovals} />
          <KpiTile label="Active events" value={stats.activeEvents} />
          <KpiTile label="Upcoming events" value={stats.upcomingEvents} />
          <KpiTile label="Cancelled" value={stats.cancelledEvents} />
          <KpiTile label="Consumers" value={stats.totalConsumers} />
          <KpiTile label="Event Admins" value={stats.totalEventAdmins} />
          <KpiTile label="Registrations" value={stats.totalRegistrations} />
          <KpiTile
            label="Pending payments"
            value={stats.pendingPaymentsCount}
            hint={money(stats.pendingPaymentsValue)}
          />
          <KpiTile label="Refunds open" value={stats.refundsOpen} hint={money(stats.refundsValue)} />
          <KpiTile
            label="Total revenue"
            value={moneyCompact(stats.totalRevenue)}
            hint="Reconciled"
            emphasis
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
          <Panel title="Needs your attention" subtitle={`${attention.length} item(s)`}>
            <div className="flex flex-col gap-2.5 px-4 pb-4">
              {attention.length === 0 && (
                <p className="py-4 text-[13px] text-ink-2">
                  Nothing waiting. Approvals, unverified payments and refund requests all
                  land here.
                </p>
              )}
              {attention.map((a) => (
                <div
                  key={a.title}
                  className="flex items-center gap-3 rounded-[13px] bg-soft px-3.5 py-3"
                >
                  <span className={`grid size-8 shrink-0 place-items-center rounded-[9px] ${a.tone}`}>
                    {a.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold">{a.title}</span>
                    <span className="block truncate text-[11.5px] text-ink-3">{a.sub}</span>
                  </span>
                  <Link
                    href={a.href}
                    className="shrink-0 rounded-btn-sm bg-ink px-3 py-1.5 text-[12px] font-bold text-white"
                  >
                    {a.cta}
                  </Link>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Today's events" subtitle={`${todays.length} running`}>
            <div className="flex flex-col gap-3 px-4 pb-4">
              {todays.length === 0 && (
                <p className="py-3 text-[13px] text-ink-2">No events scheduled today.</p>
              )}
              {todays.slice(0, 5).map((e) => (
                <Link key={e.id} href={`/admin/events`} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold">{e.name}</span>
                    <span className="block truncate text-[11px] text-ink-3">
                      {e.sport?.name} · {e.organization?.name ?? e.organizer?.full_name}
                    </span>
                  </span>
                  <EventStatusBadge status={e.status} dot={false} />
                </Link>
              ))}
            </div>
          </Panel>
        </div>

        {/* BRD §19 charts */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Revenue by month" subtitle="AED, reconciled">
            <BarChart data={revenueByMonth} format={(v) => money(v)} />
          </Panel>
          <Panel title="Registrations by month">
            <BarChart data={registrationsByMonth} />
          </Panel>
          <Panel title="Events by sport">
            <BarChart data={eventsBySport} />
          </Panel>
          <Panel title="Revenue by sport" subtitle="AED, reconciled">
            <BarChart data={revenueBySport} format={(v) => money(v)} />
          </Panel>
        </div>

        {queue.length > 0 && (
          <Panel
            className="mt-4"
            title="Approval queue"
            action={
              <Link href="/admin/approvals" className="text-[12px] font-bold text-volt-deep">
                Open queue
              </Link>
            }
          >
            <ul className="divide-y divide-line">
              {queue.slice(0, 5).map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/admin/approvals/${e.id}`}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-soft/60"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-bold">{e.name}</span>
                      <span className="block truncate text-[11.5px] text-ink-3">
                        {e.organization?.name ?? e.organizer?.full_name} ·{" "}
                        {e.submitted_at
                          ? `submitted ${formatRelative(e.submitted_at)}`
                          : formatDate(e.starts_at)}
                      </span>
                    </span>
                    <EventStatusBadge status={e.status} dot={false} />
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </PortalBody>
    </>
  );
}
