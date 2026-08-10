"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { DataTable, type Column } from "@/components/ui/table";
import { PaymentStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input, Checkbox } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/overlay";
import { EmptyState, useToast } from "@/components/ui/feedback";
import { markPaymentPaid, markPaymentsPaid } from "@/lib/actions/admin";
import { PAYMENT_METHOD } from "@/lib/status";
import { money, formatDate } from "@/lib/format";
import type { Enums } from "@/lib/database.types";

export type AdminPaymentRow = {
  id: string;
  reference_code: string;
  status: Enums<"payment_status">;
  method: Enums<"payment_method">;
  total_amount: number;
  platform_fee_amount: number;
  currency: string;
  created_at: string;
  payer_reference: string | null;
  admin_note: string | null;
  event: { id: string; name: string; slug: string } | null;
  registration: {
    id: string;
    participant_name: string;
    participant_email: string | null;
    team: { name: string } | null;
  } | null;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "processing", label: "Awaiting verification" },
  { key: "pending", label: "Not paid" },
  { key: "paid", label: "Paid" },
  { key: "refunded", label: "Refunded" },
];

export function AdminPaymentsTable({
  rows,
  initialStatus,
}: {
  rows: AdminPaymentRow[];
  initialStatus: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [filter, setFilter] = useState(initialStatus);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  const visible = useMemo(() => {
    let list = rows;
    if (filter !== "all") list = list.filter((r) => r.status === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.reference_code.toLowerCase().includes(q) ||
          r.registration?.participant_name.toLowerCase().includes(q) ||
          r.event?.name.toLowerCase().includes(q) ||
          r.payer_reference?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, filter, query]);

  const settleable = visible.filter((r) => ["pending", "processing"].includes(r.status));
  const allSelected = settleable.length > 0 && settleable.every((r) => selected.has(r.id));

  const columns: Column<AdminPaymentRow>[] = [
    {
      key: "select",
      header: (
        <Checkbox
          label=""
          aria-label="Select all settleable payments"
          checked={allSelected}
          onChange={(e) =>
            setSelected(e.currentTarget.checked ? new Set(settleable.map((r) => r.id)) : new Set())
          }
        />
      ),
      width: "44px",
      render: (r) =>
        ["pending", "processing"].includes(r.status) ? (
          <Checkbox
            label=""
            aria-label={`Select ${r.reference_code}`}
            checked={selected.has(r.id)}
            onChange={(e) => {
              const next = new Set(selected);
              if (e.currentTarget.checked) next.add(r.id);
              else next.delete(r.id);
              setSelected(next);
            }}
          />
        ) : null,
    },
    {
      key: "who",
      header: "Consumer",
      width: "1.6fr",
      render: (r) => (
        <div className="min-w-0">
          <div className="truncate font-bold">
            {r.registration?.participant_name ?? "—"}
          </div>
          <div className="truncate text-[11px] text-ink-3">
            {r.registration?.team?.name ?? r.registration?.participant_email ?? ""}
          </div>
        </div>
      ),
    },
    {
      key: "event",
      header: "Event",
      width: "1.6fr",
      render: (r) => (
        <div className="min-w-0">
          <Link
            href={r.event ? `/e/${r.event.slug}` : "#"}
            className="block truncate font-bold"
          >
            {r.event?.name ?? "—"}
          </Link>
          <div className="truncate text-[11px] text-volt-deep">{r.reference_code}</div>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      width: "1fr",
      align: "right",
      render: (r) => (
        <div>
          <div className="font-bold tabular-nums">{money(r.total_amount, r.currency)}</div>
          <div className="text-[10.5px] text-ink-3 tabular-nums">
            fee {money(r.platform_fee_amount, r.currency)}
          </div>
        </div>
      ),
    },
    {
      key: "method",
      header: "Method",
      width: "1.1fr",
      render: (r) => (
        <div>
          <div className="text-ink-2">{PAYMENT_METHOD[r.method].label}</div>
          {r.payer_reference && (
            <div className="text-[10.5px] text-ink-3">their ref: {r.payer_reference}</div>
          )}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "1.3fr",
      render: (r) => <PaymentStatusBadge status={r.status} />,
    },
    {
      key: "action",
      header: "",
      width: "1.2fr",
      align: "right",
      render: (r) =>
        ["pending", "processing"].includes(r.status) ? (
          <Button
            variant="success"
            size="sm"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const res = await markPaymentPaid(r.id);
              setBusy(false);
              toast(res.ok ? "Marked paid" : res.error, res.ok ? "success" : "danger");
              if (res.ok) router.refresh();
            }}
          >
            Mark paid
          </Button>
        ) : (
          <span className="text-[11px] text-ink-3">
            {r.status === "paid" ? "Settled" : formatDate(r.created_at)}
          </span>
        ),
    },
  ];

  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <Input
          density="outline"
          aria-label="Search payments"
          placeholder="Search name, event or reference"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-[260px]"
        />
        {FILTERS.map((f) => (
          <Chip key={f.key} selected={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </Chip>
        ))}
        {selected.size > 0 && (
          <Button
            variant="success"
            size="sm"
            className="ml-auto"
            onClick={() => setBulkOpen(true)}
          >
            Mark {selected.size} paid
          </Button>
        )}
      </div>

      <DataTable
        caption="Payments"
        columns={columns}
        rows={visible}
        keyOf={(r) => r.id}
        empty={<EmptyState title="No payments match" body="Try another filter." />}
      />

      <ConfirmDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        busy={busy}
        title={`Mark ${selected.size} payment(s) as paid?`}
        confirmLabel="Mark them paid"
        body="Each participant's place is confirmed and they are notified. This can't be undone in bulk."
        onConfirm={async () => {
          setBusy(true);
          const res = await markPaymentsPaid([...selected]);
          setBusy(false);
          setBulkOpen(false);
          if (!res.ok) {
            toast(res.error, "danger");
            return;
          }
          setSelected(new Set());
          toast(`${res.data.count} payment(s) marked paid`, "success");
          router.refresh();
        }}
      />
    </>
  );
}
