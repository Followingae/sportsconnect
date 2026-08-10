import Link from "next/link";
import { PortalHeader, PortalBody } from "@/components/portal/shell";
import { getAllEvents } from "@/lib/queries/admin";
import { createClient } from "@/lib/supabase/server";
import { DataTable, type Column } from "@/components/ui/table";
import { EventStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { Cover } from "@/components/ui/cover";
import { Chip } from "@/components/ui/chip";
import { EventRowActions } from "@/components/portal/event-row-actions";
import { money, formatDate } from "@/lib/format";
import { EVENT_STATUS } from "@/lib/status";
import type { Enums } from "@/lib/database.types";

export const metadata = { title: "Events" };

type Row = Awaited<ReturnType<typeof getAllEvents>>[number];

const FILTERS: { key: string; label: string; status?: Enums<"event_status"> }[] = [
  { key: "all", label: "All" },
  { key: "registration_open", label: "Live", status: "registration_open" },
  { key: "approved", label: "Approved", status: "approved" },
  { key: "published", label: "Published", status: "published" },
  { key: "draft", label: "Draft", status: "draft" },
  { key: "cancelled", label: "Cancelled", status: "cancelled" },
  { key: "completed", label: "Completed", status: "completed" },
];

export default async function AdminEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; sport?: string }>;
}) {
  const sp = await searchParams;
  const active = FILTERS.find((f) => f.key === sp.status) ?? FILTERS[0];

  const supabase = await createClient();
  const [events, sportsRes] = await Promise.all([
    getAllEvents({ status: active.status, query: sp.q, sport: sp.sport }),
    supabase.from("sports").select("slug, name").order("sort_order"),
  ]);

  const columns: Column<Row>[] = [
    {
      key: "event",
      header: "Event",
      width: "2.4fr",
      render: (e) => (
        <div className="flex items-center gap-2.5">
          <Cover
            src={e.banner_url ?? e.sport?.cover_url ?? null}
            alt=""
            scrim="none"
            sizes="40px"
            rounded="rounded-[9px]"
            fallbackLabel={e.sport?.name?.[0]}
            className="size-[34px] shrink-0"
          />
          <div className="min-w-0">
            <div className="truncate font-bold">{e.name}</div>
            <div className="truncate text-[11px] text-ink-3">
              {e.sport?.name} · {formatDate(e.starts_at)}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "organizer",
      header: "Organizer",
      width: "1.4fr",
      render: (e) => (
        <span className="text-ink-2">
          {e.organization?.name ?? e.organizer?.full_name ?? "—"}
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
      render: (e) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <EventStatusBadge status={e.status} />
          {e.is_featured && (
            <span className="rounded-full bg-volt-wash px-2 py-0.5 text-[10.5px] font-bold text-volt-deep">
              ★ Featured
            </span>
          )}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "1.6fr",
      align: "right",
      render: (e) => (
        <EventRowActions
          eventId={e.id}
          slug={e.slug}
          name={e.name}
          status={e.status}
          featured={e.is_featured}
        />
      ),
    },
  ];

  return (
    <>
      <PortalHeader crumb="Catalogue" title="Events" />
      <PortalBody>
        <form className="mb-3.5 flex flex-wrap items-center gap-2" action="/admin/events">
          <input
            name="q"
            defaultValue={sp.q ?? ""}
            placeholder="Search by name"
            aria-label="Search events"
            className="w-[220px] rounded-input border border-line-strong px-3.5 py-2 text-[13px] outline-none focus:border-ink"
          />
          <select
            name="sport"
            defaultValue={sp.sport ?? ""}
            aria-label="Filter by sport"
            className="rounded-input border border-line-strong px-3 py-2 text-[13px] outline-none focus:border-ink"
          >
            <option value="">All sports</option>
            {(sportsRes.data ?? []).map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.name}
              </option>
            ))}
          </select>
          {sp.status && <input type="hidden" name="status" value={sp.status} />}
          <button
            type="submit"
            className="rounded-btn-sm bg-ink px-3.5 py-2 text-[12px] font-bold text-white"
          >
            Apply
          </button>
        </form>

        <div className="no-scrollbar mb-3.5 flex gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={`/admin/events${f.key === "all" ? "" : `?status=${f.key}`}`}
            >
              <Chip selected={active.key === f.key}>
                {f.status ? EVENT_STATUS[f.status].label : f.label}
              </Chip>
            </Link>
          ))}
        </div>

        <DataTable
          caption="All events"
          columns={columns}
          rows={events}
          keyOf={(e) => e.id}
          empty={<EmptyState title="No events match" body="Try a different filter." />}
        />
      </PortalBody>
    </>
  );
}
