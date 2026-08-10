import Link from "next/link";
import { PortalHeader, PortalBody } from "@/components/portal/shell";
import { getApprovalQueue } from "@/lib/queries/admin";
import { DataTable, type Column } from "@/components/ui/table";
import { EventStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { Cover } from "@/components/ui/cover";
import { money, formatDate, formatRelative } from "@/lib/format";

export const metadata = { title: "Approvals" };

type Row = Awaited<ReturnType<typeof getApprovalQueue>>[number];

export default async function ApprovalsPage() {
  const queue = await getApprovalQueue();

  const columns: Column<Row>[] = [
    {
      key: "event",
      header: "Event",
      width: "2.4fr",
      render: (e) => (
        <Link href={`/admin/approvals/${e.id}`} className="flex items-center gap-2.5">
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
      key: "date",
      header: "Event date",
      width: "1.1fr",
      render: (e) => formatDate(e.starts_at),
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
      key: "submitted",
      header: "Waiting",
      width: "1.2fr",
      render: (e) => (
        <span className="text-ink-2">
          {e.submitted_at ? formatRelative(e.submitted_at) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "1.3fr",
      render: (e) => <EventStatusBadge status={e.status} />,
    },
    {
      key: "action",
      header: "",
      width: "1fr",
      align: "right",
      render: (e) => (
        <Link
          href={`/admin/approvals/${e.id}`}
          className="inline-flex rounded-btn-sm bg-ink px-3 py-1.5 text-[12px] font-bold text-white"
        >
          Review
        </Link>
      ),
    },
  ];

  return (
    <>
      <PortalHeader
        crumb={`${queue.length} pending`}
        title="Approvals"
      />
      <PortalBody>
        <p className="mb-3.5 text-[13px] text-ink-2">
          Nothing is publicly visible until it clears this queue.
        </p>
        <DataTable
          caption="Approval queue"
          columns={columns}
          rows={queue}
          keyOf={(e) => e.id}
          empty={
            <EmptyState
              title="Queue is clear"
              body="Events submitted by organizers appear here for review."
              actionLabel="All events"
              actionHref="/admin/events"
            />
          }
        />
      </PortalBody>
    </>
  );
}
