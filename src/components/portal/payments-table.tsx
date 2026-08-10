"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/ui/table";
import { PaymentStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/feedback";
import { recordCashCollected } from "@/lib/actions/organizer";
import { PAYMENT_METHOD } from "@/lib/status";
import { money, formatDate } from "@/lib/format";
import type { Enums } from "@/lib/database.types";

export type PaymentRow = {
  id: string;
  reference_code: string;
  status: Enums<"payment_status">;
  method: Enums<"payment_method">;
  total_amount: number;
  currency: string;
  created_at: string;
  payer_reference: string | null;
  registration: {
    id: string;
    participant_name: string;
    participant_email: string | null;
    team: { name: string } | null;
  } | null;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Not paid" },
  { key: "processing", label: "Awaiting verification" },
  { key: "paid", label: "Paid" },
];

export function EventPaymentsTable({
  rows,
  canEdit,
}: {
  rows: PaymentRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible = useMemo(() => {
    let list = rows;
    if (filter !== "all") list = list.filter((r) => r.status === filter);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.reference_code.toLowerCase().includes(q) ||
          r.registration?.participant_name.toLowerCase().includes(q) ||
          r.payer_reference?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, filter, query]);

  const columns: Column<PaymentRow>[] = [
    {
      key: "who",
      header: "Participant",
      width: "1.7fr",
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
      key: "reference",
      header: "Reference",
      width: "1.2fr",
      render: (r) => (
        <div>
          <div className="font-bold text-volt-deep">{r.reference_code}</div>
          {r.payer_reference && (
            <div className="text-[11px] text-ink-3">their ref: {r.payer_reference}</div>
          )}
        </div>
      ),
    },
    {
      key: "method",
      header: "Method",
      width: "1.1fr",
      render: (r) => <span className="text-ink-2">{PAYMENT_METHOD[r.method].label}</span>,
    },
    {
      key: "amount",
      header: "Amount",
      width: "1fr",
      align: "right",
      render: (r) => (
        <span className="font-bold tabular-nums">{money(r.total_amount, r.currency)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "1.3fr",
      render: (r) => <PaymentStatusBadge status={r.status} dot={false} />,
    },
    {
      key: "action",
      header: "",
      width: "1.2fr",
      align: "right",
      render: (r) =>
        canEdit && r.status === "pending" && r.method === "cash_at_venue" ? (
          <Button
            variant="ink"
            size="sm"
            loading={busyId === r.id}
            onClick={async () => {
              setBusyId(r.id);
              const res = await recordCashCollected(r.id);
              setBusyId(null);
              toast(res.ok ? "Cash recorded" : res.error, res.ok ? "success" : "danger");
              if (res.ok) router.refresh();
            }}
          >
            Record cash
          </Button>
        ) : (
          <span className="text-[11px] text-ink-3">
            {r.status === "paid"
              ? "Settled"
              : r.status === "processing"
                ? "With Super Admin"
                : formatDate(r.created_at)}
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
          placeholder="Search name or reference"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-[240px]"
        />
        {FILTERS.map((f) => (
          <Chip key={f.key} selected={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </Chip>
        ))}
      </div>

      <DataTable caption="Payments" columns={columns} rows={visible} keyOf={(r) => r.id} />
    </>
  );
}
