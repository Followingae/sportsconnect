import { PortalHeader, PortalBody } from "@/components/portal/shell";
import { createClient } from "@/lib/supabase/server";
import { Panel, KpiTile } from "@/components/ui/card";
import { ComingSoonBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { pluralize } from "@/lib/format";

export const metadata = { title: "Venues" };

/**
 * Venue *accounts* are gated until after launch. Venues still exist as data,
 * so this shows where events are actually happening and lets the team
 * pre-register places ahead of the venue product.
 */
export default async function AdminVenuesPage() {
  const supabase = await createClient();
  const [{ data: venues }, { data: events }] = await Promise.all([
    supabase.from("venues").select("*").order("name"),
    supabase.from("events").select("venue_name, venue_address, status"),
  ]);

  // Venues that only exist as free text on events, not yet in the venues table.
  const known = new Set((venues ?? []).map((v) => v.name.toLowerCase()));
  const fromEvents = new Map<string, { name: string; address: string | null; count: number }>();

  for (const e of events ?? []) {
    if (!e.venue_name) continue;
    const k = e.venue_name.toLowerCase();
    const existing = fromEvents.get(k);
    if (existing) existing.count++;
    else fromEvents.set(k, { name: e.venue_name, address: e.venue_address, count: 1 });
  }

  const unregistered = [...fromEvents.values()].filter((v) => !known.has(v.name.toLowerCase()));

  return (
    <>
      <PortalHeader
        crumb="Catalogue"
        title="Venues"
        actions={<ComingSoonBadge />}
      />
      <PortalBody>
        <div className="mb-4 rounded-panel bg-ink p-5 text-white">
          <ComingSoonBadge />
          <h2 className="mt-3 text-[18px] font-extrabold tracking-[-0.02em]">
            Venue accounts aren&apos;t live yet
          </h2>
          <p className="mt-2 max-w-[560px] text-[13px] leading-relaxed text-ink-inverse">
            Venues can&apos;t sign in or manage their own courts yet. Everything below is
            reference data drawn from the events organizers have created, so the team can
            see where games actually happen before the venue product ships.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile label="Registered venues" value={venues?.length ?? 0} />
          <KpiTile label="Venues seen on events" value={fromEvents.size} />
          <KpiTile label="Not yet registered" value={unregistered.length} />
          <KpiTile label="Claimed accounts" value={0} hint="Gated until launch" />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Registered venues" subtitle={pluralize(venues?.length ?? 0, "venue")}>
            {(venues ?? []).length === 0 ? (
              <EmptyState
                title="None pre-registered"
                body="Venues added here will be ready to claim their account at launch."
              />
            ) : (
              <ul className="divide-y divide-line">
                {(venues ?? []).map((v) => (
                  <li key={v.id} className="px-4 py-3">
                    <p className="text-[13.5px] font-bold">{v.name}</p>
                    <p className="text-[11px] text-ink-3">
                      {[v.address, v.city].filter(Boolean).join(", ")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Seen on events"
            subtitle="Named by organizers, not yet registered"
          >
            {unregistered.length === 0 ? (
              <EmptyState title="Nothing new" />
            ) : (
              <ul className="divide-y divide-line">
                {unregistered.map((v) => (
                  <li key={v.name} className="flex items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-bold">{v.name}</p>
                      <p className="truncate text-[11px] text-ink-3">
                        {v.address ?? "No address given"}
                      </p>
                    </div>
                    <span className="shrink-0 text-[12px] text-ink-2">
                      {pluralize(v.count, "event")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </PortalBody>
    </>
  );
}
