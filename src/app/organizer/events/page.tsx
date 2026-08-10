import Link from "next/link";
import { Plus } from "lucide-react";
import { PortalHeader, PortalBody } from "@/components/portal/shell";
import { getOrganizerEvents } from "@/lib/queries/organizer";
import { DataTable, type Column } from "@/components/ui/table";
import { EventStatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/feedback";
import { Cover } from "@/components/ui/cover";
import { Chip } from "@/components/ui/chip";
import { money, formatDate } from "@/lib/format";
import { EVENT_STATUS } from "@/lib/status";
import type { Enums } from "@/lib/database.types";

export const metadata = { title: "My events" };

type Row = Awaited<ReturnType<typeof getOrganizerEvents>>[number];

const FILTERS: { key: string; label: string; status?: Enums<"event_status"> }[] = [
  { key: "all", label: "All" },
  { key: "draft", label: "Draft", status: "draft" },
  { key: "submitted", label: "Submitted", status: "submitted" },
  { key: "changes_requested", label: "Changes requested", status: "changes_requested" },
  { key: "registration_open", label: "Live", status: "registration_open" },
  { key: "completed", label: "Completed", status: "completed" },
];

export default async function OrganizerEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const active = FILTERS.find((f) => f.key === sp.status) ?? FILTERS[0];
  const events = await getOrganizerEvents({ status: active.status, query: sp.q });

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
              {e.sport?.name} · {e.format?.name}
            </span>
          </span>
        </Link>
      ),
    },
    { key: "date", header: "Date", width: "1.1fr", render: (e) => formatDate(e.starts_at) },
    {
      key: "capacity",
      header: "Capacity",
      width: "1fr",
      render: (e) => (
        <span className="text-ink-2 tabular-nums">
          {e.config?.max_teams ?? e.config?.max_participants ?? "—"}
        </span>
      ),
    },
    {
      key: "entry",
      header: "Entry",
      width: "1fr",
      align: "right",
      render: (e) => <span className="tabular-nums">{money(e.price_amount, e.currency)}</span>,
    },
    {
      key: "status",
      header: "Status",
      width: "1.4fr",
      render: (e) => <EventStatusBadge status={e.status} />,
    },
    {
      key: "actions",
      header: "",
      width: "1fr",
      align: "right",
      render: (e) => (
        <Link
          href={`/organizer/events/${e.id}`}
          className="inline-flex rounded-btn-sm border border-line-strong px-3 py-1.5 text-[12px] font-bold"
        >
          {["draft", "changes_requested"].includes(e.status) ? "Continue" : "Manage"}
        </Link>
      ),
    },
  ];

  return (
    <>
      <PortalHeader
        crumb={`${events.length} event(s)`}
        title="My events"
        actions={
          <ButtonLink href="/organizer/events/new" size="sm" icon={<Plus size={14} />}>
            Create event
          </ButtonLink>
        }
      />
      <PortalBody>
        <form className="mb-3.5 flex flex-wrap items-center gap-2" action="/organizer/events">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Search by name"
            aria-label="Search events"
            className="w-[220px] rounded-input border border-line-strong px-3.5 py-2 text-[13px] outline-none focus:border-ink"
          />
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <button
            type="submit"
            className="rounded-btn-sm bg-ink px-3.5 py-2 text-[12px] font-bold text-white"
          >
            Search
          </button>
        </form>

        <div className="no-scrollbar mb-3.5 flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/organizer/events${f.key === "all" ? "" : `?status=${f.key}`}`}
            >
              <Chip selected={active.key === f.key}>
                {f.status ? EVENT_STATUS[f.status].label : f.label}
              </Chip>
            </Link>
          ))}
        </div>

        <DataTable
          caption="My events"
          columns={columns}
          rows={events}
          keyOf={(e) => e.id}
          empty={
            <EmptyState
              title={sp.q || sp.status ? "Nothing matches" : "No events yet"}
              body={
                sp.q || sp.status
                  ? "Try a different filter or search term."
                  : "Create your first event and submit it for approval."
              }
              actionLabel={sp.q || sp.status ? "Clear filters" : "Create event"}
              actionHref={sp.q || sp.status ? "/organizer/events" : "/organizer/events/new"}
            />
          }
        />
      </PortalBody>
    </>
  );
}
