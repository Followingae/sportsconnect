import Link from "next/link";
import { PortalHeader, PortalBody } from "@/components/portal/shell";
import { getConsumers } from "@/lib/queries/admin";
import { DataTable, type Column } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/feedback";
import { money, formatDate } from "@/lib/format";
import type { Enums } from "@/lib/database.types";

export const metadata = { title: "Consumers" };

type Row = Awaited<ReturnType<typeof getConsumers>>[number];

export default async function ConsumersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const consumers = await getConsumers(q);

  const columns: Column<Row>[] = [
    {
      key: "consumer",
      header: "Consumer",
      width: "2fr",
      render: (c) => (
        <Link href={`/admin/consumers/${c.id}`} className="flex items-center gap-2.5">
          <Avatar name={c.full_name || c.email} size="sm" />
          <span className="min-w-0">
            <span className="block truncate font-bold">{c.full_name || "Unnamed"}</span>
            <span className="block truncate text-[11px] text-ink-3">
              Joined {formatDate(c.created_at)}
            </span>
          </span>
        </Link>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      width: "1.6fr",
      render: (c) => (
        <div className="min-w-0">
          <div className="truncate text-ink-2">{c.email}</div>
          {c.phone && <div className="truncate text-[11px] text-ink-3">{c.phone}</div>}
        </div>
      ),
    },
    {
      key: "regs",
      header: "Registrations",
      width: "1fr",
      render: (c) => <span className="text-ink-2 tabular-nums">{c.registrations}</span>,
    },
    {
      key: "spend",
      header: "Spend",
      width: "1fr",
      align: "right",
      render: (c) => <span className="font-bold tabular-nums">{money(c.spend)}</span>,
    },
    {
      key: "status",
      header: "Status",
      width: "1fr",
      render: (c) => (
        <Badge
          tone={c.status === "active" ? "success" : c.status === "suspended" ? "danger" : "neutral"}
          dot
        >
          {c.status[0].toUpperCase() + c.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: "action",
      header: "",
      width: "0.9fr",
      align: "right",
      render: (c) => (
        <Link
          href={`/admin/consumers/${c.id}`}
          className="inline-flex rounded-btn-sm border border-line-strong px-3 py-1.5 text-[12px] font-bold"
        >
          View
        </Link>
      ),
    },
  ];

  return (
    <>
      <PortalHeader crumb={`Community · ${consumers.length} total`} title="Consumers" />
      <PortalBody>
        <form className="mb-3.5 flex items-center gap-2" action="/admin/consumers">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by name or email"
            aria-label="Search consumers"
            className="w-[260px] rounded-input border border-line-strong px-3.5 py-2 text-[13px] outline-none focus:border-ink"
          />
          <button
            type="submit"
            className="rounded-btn-sm bg-ink px-3.5 py-2 text-[12px] font-bold text-white"
          >
            Search
          </button>
          {q && (
            <Link href="/admin/consumers" className="text-[12.5px] font-bold text-volt-deep">
              Clear
            </Link>
          )}
        </form>

        <DataTable
          caption="Consumers"
          columns={columns}
          rows={consumers}
          keyOf={(c) => c.id}
          empty={
            <EmptyState
              title={q ? "Nobody matches that search" : "No consumers yet"}
              body={q ? "Try a different name or email." : undefined}
            />
          }
        />
      </PortalBody>
    </>
  );
}
