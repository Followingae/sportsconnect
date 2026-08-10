import Link from "next/link";
import { AlertCircle, Plus } from "lucide-react";
import { PortalHeader, PortalBody } from "@/components/portal/shell";
import { getOrganizerEvents, getOrganizerStats } from "@/lib/queries/organizer";
import { KpiTile, Panel, ProgressBar } from "@/components/ui/card";
import { EventStatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { DataTable, type Column } from "@/components/ui/table";
import { Cover } from "@/components/ui/cover";
import { money, moneyCompact, formatDate } from "@/lib/format";

export const metadata = { title: "Dashboard" };

type Row = Awaited<ReturnType<typeof getOrganizerEvents>>[number];

export default async function OrganizerDashboard() {
  const [stats, events] = await Promise.all([getOrganizerStats(), getOrganizerEvents()]);

  const needsAttention = events.filter((e) =>
    ["changes_requested", "rejected", "draft"].includes(e.status)
  );

  const columns: Column<Row>[] = [
    {
      key: "event",
      header: "Event",
      width: "2.4fr",
      render: (e) => (
        <Link href={`/organizer/events/${e.id}`} className="flex items-center gap-2.5">
          <Cover
            src={e.banner_url ?? e.sport?.cover_url ?? null}
            alt=""
            scrim="none"
            sizes="40px"
            rounded="rounded-[9px]"
            fallbackLabel={e.sport?.name?.[0]}
            className="size-[34px] shrink-0"
          />
          <span className="min-w-0">
            <span className="block truncate font-bold">{e.name}</span>
            <span className="block truncate text-[11px] text-ink-3">
              {e.format?.name} · {formatDate(e.starts_at)}
            </span>
          </span>
        </Link>
      ),
    },
    {
      key: "sport",
      header: "Sport",
      width: "1fr",
      render: (e) => <span className="text-ink-2">{e.sport?.name}</span>,
    },
    {
      key: "status",
      header: "Status",
      width: "1.3fr",
      render: (e) => <EventStatusBadge status={e.status} />,
    },
    {
      key: "fee",
      header: "Entry",
      width: "1fr",
      align: "right",
      render: (e) => (
        <span className="tabular-nums">{money(e.price_amount, e.currency)}</span>
      ),
    },
    {
      key: "action",
      header: "",
      width: "1fr",
      align: "right",
      render: (e) => (
        <Link
          href={`/organizer/events/${e.id}`}
          className="inline-flex rounded-btn-sm border border-line-strong px-3 py-1.5 text-[12px] font-bold"
        >
          {e.status === "draft" ? "Continue" : "Manage"}
        </Link>
      ),
    },
  ];

  return (
    <>
      <PortalHeader
        crumb="Overview"
        title="Dashboard"
        actions={
          <ButtonLink href="/organizer/events/new" size="sm" icon={<Plus size={14} />}>
            Create event
          </ButtonLink>
        }
      />

      <PortalBody>
        {/* BRD §21 — all nine KPIs */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <KpiTile label="Total events" value={stats.totalEvents} />
          <KpiTile label="Draft" value={stats.draft} />
          <KpiTile label="Pending approval" value={stats.pendingApproval} />
          <KpiTile label="Approved / live" value={stats.approved} />
          <KpiTile label="Upcoming" value={stats.upcoming} />
          <KpiTile label="Registrations" value={stats.registrations} />
          <KpiTile
            label="Pending payments"
            value={stats.pendingPayments}
            hint={money(stats.pendingPaymentValue)}
          />
          <KpiTile
            label="Expected collection"
            value={moneyCompact(stats.expected)}
            hint="Settled by Sportsconnect"
            emphasis
          />
          <KpiTile label="Collected" value={moneyCompact(stats.collected)} />
        </div>

        {/* changes requested — closes the approval loop */}
        {needsAttention.length > 0 && (
          <Panel
            className="mt-4"
            title="Needs your attention"
            subtitle={`${needsAttention.length} event(s)`}
          >
            <div className="flex flex-col gap-2.5 px-4 pb-4">
              {needsAttention.map((e) => (
                <Link
                  key={e.id}
                  href={`/organizer/events/${e.id}`}
                  className="flex items-center gap-3 rounded-[13px] bg-soft px-3.5 py-3"
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-warning-wash text-warning">
                    <AlertCircle size={16} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-bold">{e.name}</span>
                    <span className="block truncate text-[11.5px] text-ink-3">
                      {e.status === "changes_requested" && e.review_note
                        ? e.review_note
                        : e.status === "draft"
                          ? "Draft — not submitted yet"
                          : "Not approved"}
                    </span>
                  </span>
                  <EventStatusBadge status={e.status} />
                </Link>
              ))}
            </div>
          </Panel>
        )}

        <Panel
          className="mt-4"
          title="My events"
          subtitle={`${events.length} total · ${stats.pendingApproval} awaiting Super Admin`}
          action={
            <Link href="/organizer/events" className="text-[12px] font-bold text-volt-deep">
              See all
            </Link>
          }
        >
          <DataTable
            caption="My events"
            columns={columns}
            rows={events.slice(0, 8)}
            keyOf={(e) => e.id}
            className="rounded-none border-0 border-t"
            empty={
              <EmptyState
                title="No events yet"
                body="Create your first event and submit it for approval."
                actionLabel="Create event"
                actionHref="/organizer/events/new"
              />
            }
          />
        </Panel>
      </PortalBody>
    </>
  );
}
