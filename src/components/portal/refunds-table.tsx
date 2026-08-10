"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/ui/table";
import { RefundStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Modal } from "@/components/ui/overlay";
import { Field, Input, Textarea } from "@/components/ui/field";
import { EmptyState, useToast } from "@/components/ui/feedback";
import { decideRefund } from "@/lib/actions/admin";
import { REFUND_TYPE } from "@/lib/status";
import { money, formatDate } from "@/lib/format";
import type { Enums } from "@/lib/database.types";

export type RefundRow = {
  id: string;
  amount: number;
  currency: string;
  type: Enums<"refund_type">;
  status: Enums<"refund_status">;
  reason: string | null;
  policy_applied: string | null;
  created_at: string;
  settlement_note: string | null;
  initiated_by_role: Enums<"user_role"> | null;
  payment: { reference_code: string; total_amount: number; method: Enums<"payment_method"> } | null;
  registration: {
    participant_name: string;
    event: { name: string; slug: string } | null;
  } | null;
};

const FILTERS = [
  { key: "open", label: "Open" },
  { key: "all", label: "All" },
  { key: "refunded", label: "Refunded" },
  { key: "declined", label: "Declined" },
];

export function RefundsTable({ rows }: { rows: RefundRow[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("open");
  const [decideFor, setDecideFor] = useState<RefundRow | null>(null);

  const visible = useMemo(() => {
    if (filter === "all") return rows;
    if (filter === "open")
      return rows.filter((r) => ["requested", "approved", "processing"].includes(r.status));
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const columns: Column<RefundRow>[] = [
    {
      key: "who",
      header: "Consumer",
      width: "1.4fr",
      render: (r) => (
        <div className="min-w-0">
          <div className="truncate font-bold">
            {r.registration?.participant_name ?? "—"}
          </div>
          <div className="truncate text-[11px] text-ink-3">
            {r.initiated_by_role === "consumer" ? "by consumer" : "by organizer or admin"}
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
          <div className="truncate font-bold">{r.registration?.event?.name ?? "—"}</div>
          <div className="truncate text-[11px] text-volt-deep">
            {r.payment?.reference_code}
          </div>
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
          <div className="font-bold tabular-nums">{money(r.amount, r.currency)}</div>
          {r.payment && Number(r.payment.total_amount) !== Number(r.amount) && (
            <div className="text-[10.5px] text-ink-3 tabular-nums">
              of {money(r.payment.total_amount, r.currency)}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "reason",
      header: "Reason",
      width: "1.8fr",
      render: (r) => (
        <div className="min-w-0">
          <div className="truncate text-ink-2">{r.reason ?? "—"}</div>
          <div className="truncate text-[10.5px] text-ink-3">{REFUND_TYPE[r.type]}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "1.1fr",
      render: (r) => <RefundStatusBadge status={r.status} />,
    },
    {
      key: "action",
      header: "",
      width: "1.1fr",
      align: "right",
      render: (r) =>
        ["requested", "approved", "processing"].includes(r.status) ? (
          <Button variant="ink" size="sm" onClick={() => setDecideFor(r)}>
            Decide
          </Button>
        ) : (
          <span className="text-[11px] text-ink-3">{formatDate(r.created_at)}</span>
        ),
    },
  ];

  return (
    <>
      <div className="mb-3.5 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Chip key={f.key} selected={filter === f.key} onClick={() => setFilter(f.key)}>
            {f.label}
          </Chip>
        ))}
      </div>

      <DataTable
        caption="Refunds"
        columns={columns}
        rows={visible}
        keyOf={(r) => r.id}
        empty={
          <EmptyState
            title={filter === "open" ? "No open refund requests" : "Nothing here"}
            body="Requests appear when a consumer cancels or an event is called off."
          />
        }
      />

      {decideFor && (
        <DecideModal
          refund={decideFor}
          onClose={() => setDecideFor(null)}
          onDone={() => {
            setDecideFor(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}

function DecideModal({
  refund,
  onClose,
  onDone,
}: {
  refund: RefundRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [amount, setAmount] = useState(String(refund.amount));
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const original = Number(refund.payment?.total_amount ?? refund.amount);
  const value = Number(amount) || 0;
  const partial = value > 0 && value < original;

  return (
    <Modal
      open
      onClose={onClose}
      title="Refund decision"
      description={`${refund.registration?.participant_name} · ${refund.registration?.event?.name ?? ""}`}
      width={460}
      footer={
        <>
          <Button
            variant="danger"
            size="md"
            className="flex-1"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const res = await decideRefund(refund.id, "decline", { note });
              setBusy(false);
              if (!res.ok) {
                toast(res.error, "danger");
                return;
              }
              toast("Refund declined", "success");
              onDone();
            }}
          >
            Decline
          </Button>
          <Button
            variant="success"
            size="md"
            className="flex-[2]"
            loading={busy}
            onClick={async () => {
              if (value <= 0 || value > original) {
                toast(`Enter an amount between 0 and ${original}.`, "danger");
                return;
              }
              setBusy(true);
              const res = await decideRefund(refund.id, "approve", { amount: value, note });
              setBusy(false);
              if (!res.ok) {
                toast(res.error, "danger");
                return;
              }
              toast("Refund recorded", "success");
              onDone();
            }}
          >
            {partial ? "Approve partial refund" : "Approve full refund"}
          </Button>
        </>
      }
    >
      <div className="mb-3.5 rounded-[10px] bg-soft p-3 text-[12.5px] text-ink-2">
        <div className="flex justify-between">
          <span>Original payment</span>
          <span className="font-bold tabular-nums">{money(original, refund.currency)}</span>
        </div>
        {refund.reason && <p className="mt-2">Reason given: {refund.reason}</p>}
        {refund.policy_applied && <p className="mt-1">Policy: {refund.policy_applied}</p>}
      </div>

      <Field
        label="Refund amount"
        required
        hint={partial ? "Less than the original — recorded as a partial refund." : undefined}
      >
        <Input
          density="outline"
          type="number"
          min={0}
          max={original}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>

      <Field
        label="Settlement note"
        className="mt-3.5"
        hint="How the money went back, e.g. the bank transfer reference."
      >
        <Textarea
          density="outline"
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Refunded via Emirates NBD, ref TRF-99213"
        />
      </Field>
    </Modal>
  );
}
