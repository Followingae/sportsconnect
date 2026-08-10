import { PortalHeader, PortalBody } from "@/components/portal/shell";
import { getPlatformStats, getAllEvents } from "@/lib/queries/admin";
import { createClient } from "@/lib/supabase/server";
import { KpiTile, Panel } from "@/components/ui/card";
import { BarChart } from "@/components/portal/bar-chart";
import { EmptyState } from "@/components/ui/feedback";
import { money, moneyCompact } from "@/lib/format";

export const metadata = { title: "Reports" };

/** BRD §19 — the seven chart types, plus top events and admin performance. */
export default async function AdminReportsPage() {
  const supabase = await createClient();
  const [stats, events, sportsRes, orgsRes, regsRes] = await Promise.all([
    getPlatformStats(),
    getAllEvents(),
    supabase.from("sports").select("id, name").order("sort_order"),
    supabase.from("organizations").select("id, name"),
    supabase.from("registrations").select("event_id, status"),
  ]);

  const sports = sportsRes.data ?? [];
  const regs = (regsRes.data ?? []).filter((r) => r.status !== "cancelled");

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

  const eventSport = new Map(stats.raw.events.map((e) => [e.id, e.sport_id]));

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

  const bySport = (fn: (sportId: string) => number) =>
    sports.map((s) => ({ label: s.name.slice(0, 9), value: fn(s.id) }));

  const eventsBySport = bySport(
    (id) => stats.raw.events.filter((e) => e.sport_id === id).length
  );
  const registrationsBySport = bySport(
    (id) => regs.filter((r) => eventSport.get(r.event_id) === id).length
  );
  const revenueBySport = bySport((id) =>
    stats.raw.payments
      .filter((p) => p.status === "paid" && eventSport.get(p.event_id) === id)
      .reduce((s, p) => s + Number(p.total_amount), 0)
  );

  const topEvents = [...events]
    .map((e) => ({
      name: e.name,
      registrations: regs.filter((r) => r.event_id === e.id).length,
      revenue: stats.raw.payments
        .filter((p) => p.event_id === e.id && p.status === "paid")
        .reduce((s, p) => s + Number(p.total_amount), 0),
      organizer: e.organization?.name ?? e.organizer?.full_name ?? "—",
    }))
    .filter((e) => e.registrations > 0)
    .sort((a, b) => b.registrations - a.registrations)
    .slice(0, 8);

  const adminPerformance = (orgsRes.data ?? [])
    .map((o) => {
      const owned = events.filter((e) => e.organization?.name === o.name);
      return {
        label: o.name.slice(0, 10),
        value: owned.reduce(
          (s, e) => s + regs.filter((r) => r.event_id === e.id).length,
          0
        ),
      };
    })
    .filter((x) => x.value > 0);

  return (
    <>
      <PortalHeader crumb="Oversight" title="Reports" />
      <PortalBody>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile label="Total revenue" value={moneyCompact(stats.totalRevenue)} emphasis />
          <KpiTile label="Registrations" value={stats.totalRegistrations} />
          <KpiTile label="Events" value={stats.totalEvents} />
          <KpiTile label="Consumers" value={stats.totalConsumers} />
        </div>

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
          <Panel title="Registrations by sport">
            <BarChart data={registrationsBySport} />
          </Panel>
          <Panel title="Revenue by sport" subtitle="AED, reconciled">
            <BarChart data={revenueBySport} format={(v) => money(v)} />
          </Panel>
          <Panel title="Event Admin performance" subtitle="Registrations driven">
            <BarChart data={adminPerformance} />
          </Panel>
        </div>

        <Panel className="mt-4" title="Top events" subtitle="By registrations">
          {topEvents.length === 0 ? (
            <EmptyState title="No registrations yet" />
          ) : (
            <ul className="divide-y divide-line">
              {topEvents.map((e, i) => (
                <li key={e.name} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-5 shrink-0 text-[12px] font-bold tabular-nums text-ink-3">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-bold">{e.name}</p>
                    <p className="truncate text-[11px] text-ink-3">{e.organizer}</p>
                  </div>
                  <span className="shrink-0 text-[12.5px] tabular-nums text-ink-2">
                    {e.registrations} reg
                  </span>
                  <span className="shrink-0 text-[13px] font-bold tabular-nums">
                    {money(e.revenue)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </PortalBody>
    </>
  );
}
