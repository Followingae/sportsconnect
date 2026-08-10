import { PortalHeader, PortalBody } from "@/components/portal/shell";
import { getOrganizerEvents, getOrganizerStats } from "@/lib/queries/organizer";
import { createClient } from "@/lib/supabase/server";
import { KpiTile, Panel } from "@/components/ui/card";
import { BarChart } from "@/components/portal/bar-chart";
import { money } from "@/lib/format";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function OrganizerReports() {
  const supabase = await createClient();
  const [stats, events, regsRes, paysRes] = await Promise.all([
    getOrganizerStats(),
    getOrganizerEvents(),
    supabase.from("registrations").select("event_id, registered_at, status"),
    supabase.from("payments").select("event_id, total_amount, status, created_at"),
  ]);

  const regs = (regsRes.data ?? []).filter((r) => r.status !== "cancelled");
  const pays = paysRes.data ?? [];

  // Registrations by month, last 6 months.
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
  const monthKey = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${d.getMonth()}`;
  };

  const regsByMonth = months.map((m) => ({
    label: m.label,
    value: regs.filter((r) => monthKey(r.registered_at) === m.key).length,
  }));

  const revenueByMonth = months.map((m) => ({
    label: m.label,
    value: pays
      .filter((p) => ["paid", "processing", "pending"].includes(p.status))
      .filter((p) => monthKey(p.created_at) === m.key)
      .reduce((s, p) => s + Number(p.total_amount), 0),
  }));

  // Fill rate per event.
  const fill = events
    .map((e) => {
      const limit = e.config?.max_teams ?? e.config?.max_participants ?? 0;
      const taken = regs.filter((r) => r.event_id === e.id).length;
      return {
        label: e.name.length > 14 ? `${e.name.slice(0, 13)}…` : e.name,
        value: limit ? Math.round((taken / limit) * 100) : 0,
      };
    })
    .filter((x) => x.value > 0)
    .slice(0, 6);

  return (
    <>
      <PortalHeader crumb="Analytics" title="Reports" />
      <PortalBody>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile label="Registrations" value={stats.registrations} />
          <KpiTile label="Events" value={stats.totalEvents} />
          <KpiTile label="Expected collection" value={money(stats.expected)} emphasis />
          <KpiTile label="Reconciled" value={money(stats.collected)} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Registrations by month">
            <BarChart data={regsByMonth} />
          </Panel>
          <Panel title="Expected revenue by month" subtitle="AED">
            <BarChart data={revenueByMonth} format={(v) => money(v)} />
          </Panel>
          <Panel title="Fill rate" subtitle="% of capacity" className="lg:col-span-2">
            <BarChart data={fill} format={(v) => `${v}%`} />
          </Panel>
        </div>
      </PortalBody>
    </>
  );
}
