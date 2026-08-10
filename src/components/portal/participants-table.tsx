"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Plus, Download, MoreHorizontal } from "lucide-react";
import { DataTable, type Column } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Modal, ConfirmDialog } from "@/components/ui/overlay";
import { Field, Input, Select, SegmentedControl, Textarea } from "@/components/ui/field";
import { Chip } from "@/components/ui/chip";
import {
  RegistrationStatusBadge,
  PaymentStatusBadge,
  Badge,
} from "@/components/ui/badge";
import { useToast } from "@/components/ui/feedback";
import { Avatar } from "@/components/ui/avatar";
import { formatDate, money } from "@/lib/format";
import { PARTICIPANT_ROLE } from "@/lib/status";
import {
  addParticipant,
  updateParticipant,
  removeParticipant,
} from "@/lib/actions/organizer";
import type { Enums } from "@/lib/database.types";

export type ParticipantRow = {
  id: string;
  participant_name: string;
  participant_email: string | null;
  participant_phone: string | null;
  role: Enums<"participant_role">;
  status: Enums<"registration_status">;
  source: Enums<"registration_source">;
  registered_at: string;
  waitlist_position: number | null;
  is_captain: boolean;
  team: { id: string; name: string } | null;
  payment: {
    id: string;
    reference_code: string;
    status: Enums<"payment_status">;
    method: Enums<"payment_method">;
    total_amount: number;
    currency: string;
  } | null;
};

const STATUS_FILTERS: { key: string; label: string }[] = [
  { key: "all", label: "All" },
  { key: "confirmed", label: "Confirmed" },
  { key: "pending", label: "Pending" },
  { key: "waitlisted", label: "Waitlisted" },
  { key: "cancelled", label: "Cancelled" },
  { key: "unpaid", label: "Unpaid" },
];

export function ParticipantsTable({
  eventId,
  rows,
  teams,
  canEdit,
}: {
  eventId: string;
  rows: ParticipantRow[];
  teams: { id: string; name: string }[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();

  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<ParticipantRow | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ParticipantRow | null>(null);
  const [busy, setBusy] = useState(false);

  const visible = useMemo(() => {
    let list = rows;
    if (filter === "unpaid") {
      list = list.filter(
        (r) => r.payment && ["pending", "processing"].includes(r.payment.status)
      );
    } else if (filter !== "all") {
      list = list.filter((r) => r.status === filter);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (r) =>
          r.participant_name.toLowerCase().includes(q) ||
          r.participant_email?.toLowerCase().includes(q) ||
          r.team?.name.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, filter, query]);

  async function patch(row: ParticipantRow, p: Parameters<typeof updateParticipant>[1]) {
    setBusy(true);
    const res = await updateParticipant(row.id, p);
    setBusy(false);
    setMenuFor(null);
    toast(res.ok ? "Updated" : res.error, res.ok ? "success" : "danger");
    if (res.ok) router.refresh();
  }

  function exportCsv() {
    const header = [
      "Name", "Email", "Phone", "Team", "Role", "Registration status",
      "Payment status", "Reference", "Amount", "Source", "Registered",
    ];
    const lines = visible.map((r) =>
      [
        r.participant_name,
        r.participant_email ?? "",
        r.participant_phone ?? "",
        r.team?.name ?? "",
        PARTICIPANT_ROLE[r.role],
        r.status,
        r.payment?.status ?? "",
        r.payment?.reference_code ?? "",
        r.payment ? String(r.payment.total_amount) : "",
        r.source,
        formatDate(r.registered_at),
      ]
        // Quote every field and double internal quotes — names contain commas.
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(",")
    );

    const blob = new Blob([[header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `participants-${eventId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`Exported ${visible.length} row(s)`, "success");
  }

  const columns: Column<ParticipantRow>[] = [
    {
      key: "participant",
      header: "Participant",
      width: "1.9fr",
      render: (r) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={r.participant_name} size="sm" />
          <div className="min-w-0">
            <div className="truncate font-bold">
              {r.participant_name}
              {r.is_captain && (
                <span className="ml-1.5 text-[10px] font-bold uppercase text-volt-deep">
                  captain
                </span>
              )}
            </div>
            <div className="truncate text-[11px] text-ink-3">
              {r.participant_email ?? "No email"}
              {r.participant_phone ? ` · ${r.participant_phone}` : ""}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "team",
      header: "Team",
      width: "1fr",
      render: (r) =>
        r.team ? (
          <span className="text-ink-2">{r.team.name}</span>
        ) : (
          <span className="text-ink-3">Unassigned</span>
        ),
    },
    {
      key: "registered",
      header: "Registered",
      width: "1fr",
      render: (r) => <span className="text-ink-2">{formatDate(r.registered_at)}</span>,
    },
    {
      key: "payment",
      header: "Payment",
      width: "1.1fr",
      render: (r) =>
        r.payment ? (
          <div>
            <PaymentStatusBadge status={r.payment.status} dot={false} />
            <div className="mt-0.5 text-[10.5px] text-ink-3">
              {money(r.payment.total_amount, r.payment.currency)}
            </div>
          </div>
        ) : (
          <span className="text-ink-3">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      width: "1.1fr",
      render: (r) => <RegistrationStatusBadge status={r.status} dot={false} />,
    },
    {
      key: "source",
      header: "Source",
      width: "0.8fr",
      render: (r) => (
        <Badge tone={r.source === "admin" ? "info" : "neutral"}>
          {r.source === "admin" ? "Admin" : "Online"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "0.6fr",
      align: "right",
      render: (r) =>
        canEdit ? (
          <button
            type="button"
            aria-label={`Actions for ${r.participant_name}`}
            onClick={() => setMenuFor(r)}
            className="rounded-[8px] p-1.5 text-ink-3 hover:bg-soft hover:text-ink"
          >
            <MoreHorizontal size={16} aria-hidden />
          </button>
        ) : null,
    },
  ];

  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <Input
          density="outline"
          aria-label="Search participants"
          placeholder="Search name, email or team"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-[240px]"
        />
        <div className="no-scrollbar flex flex-1 gap-2 overflow-x-auto">
          {STATUS_FILTERS.map((f) => (
            <Chip key={f.key} selected={filter === f.key} onClick={() => setFilter(f.key)}>
              {f.label}
            </Chip>
          ))}
        </div>
        <Button variant="ghost" size="sm" icon={<Download size={14} />} onClick={exportCsv}>
          Export
        </Button>
        {canEdit && (
          <Button variant="ink" size="sm" icon={<Plus size={14} />} onClick={() => setAddOpen(true)}>
            Add participant
          </Button>
        )}
      </div>

      <DataTable
        caption="Participants"
        columns={columns}
        rows={visible}
        keyOf={(r) => r.id}
      />

      <p className="mt-3 text-[11.5px] text-ink-3">
        Every change here is written to the audit log. Recording cash marks a payment as
        collected and awaiting Super Admin reconciliation — it does not mark it paid.
      </p>

      {addOpen && (
        <AddParticipantModal
          eventId={eventId}
          teams={teams}
          onClose={() => setAddOpen(false)}
          onDone={() => {
            setAddOpen(false);
            router.refresh();
          }}
        />
      )}

      {/* row action sheet */}
      <Modal
        open={Boolean(menuFor)}
        onClose={() => setMenuFor(null)}
        title={menuFor?.participant_name ?? ""}
        description="Row actions"
        width={420}
      >
        {menuFor && (
          <div className="flex flex-col gap-2.5">
            <Field label="Registration status">
              <Select
                density="outline"
                value={menuFor.status}
                onChange={(e) =>
                  patch(menuFor, {
                    status: e.target.value as Enums<"registration_status">,
                  })
                }
              >
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="waitlisted">Waitlisted</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No show</option>
              </Select>
            </Field>

            <Field label="Team">
              <Select
                density="outline"
                value={menuFor.team?.id ?? ""}
                onChange={(e) => patch(menuFor, { team_id: e.target.value || null })}
              >
                <option value="">Unassigned</option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Role">
              <Select
                density="outline"
                value={menuFor.role}
                onChange={(e) =>
                  patch(menuFor, { role: e.target.value as Enums<"participant_role"> })
                }
              >
                <option value="player">Player</option>
                <option value="captain">Captain</option>
                <option value="substitute">Substitute</option>
              </Select>
            </Field>

            <Button
              variant="danger"
              size="md"
              block
              className="mt-1"
              onClick={() => {
                setRemoveTarget(menuFor);
                setMenuFor(null);
              }}
            >
              Remove from event
            </Button>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        destructive
        busy={busy}
        title={`Remove ${removeTarget?.participant_name ?? ""}?`}
        confirmLabel="Remove"
        body={
          removeTarget?.source === "online"
            ? "This registration was made online, so it will be cancelled rather than deleted — the record and any payment stay auditable."
            : "This admin-added participant will be deleted entirely."
        }
        onConfirm={async () => {
          if (!removeTarget) return;
          setBusy(true);
          const res = await removeParticipant(removeTarget.id);
          setBusy(false);
          setRemoveTarget(null);
          toast(res.ok ? "Removed" : res.error, res.ok ? "success" : "danger");
          if (res.ok) router.refresh();
        }}
      />
    </>
  );
}

function AddParticipantModal({
  eventId,
  teams,
  onClose,
  onDone,
}: {
  eventId: string;
  teams: { id: string; name: string }[];
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    participant_name: "",
    participant_email: "",
    participant_phone: "",
    team_id: "",
    role: "player" as "player" | "captain" | "substitute",
    status: "confirmed" as "pending" | "confirmed" | "waitlisted",
    payment: "pending" as "paid_offline" | "pending" | "comp",
    notes: "",
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  return (
    <Modal
      open
      onClose={onClose}
      title="Add participant"
      description="Walk-in, offline payment, comp or VIP"
      width={480}
      footer={
        <>
          <Button variant="ghost" size="md" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="md"
            className="flex-[2]"
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const res = await addParticipant({ event_id: eventId, ...form });
              setBusy(false);
              if (!res.ok) {
                toast(res.error, "danger");
                return;
              }
              toast("Participant added", "success");
              onDone();
            }}
          >
            Add &amp; confirm
          </Button>
        </>
      }
    >
      <div className="grid gap-3.5 md:grid-cols-2">
        <Field label="Full name" required className="md:col-span-2">
          <Input
            density="outline"
            value={form.participant_name}
            onChange={(e) => set("participant_name", e.target.value)}
            placeholder="Sara Monteiro"
          />
        </Field>
        <Field label="Email">
          <Input
            density="outline"
            type="email"
            value={form.participant_email}
            onChange={(e) => set("participant_email", e.target.value)}
            placeholder="name@mail.com"
          />
        </Field>
        <Field label="Phone">
          <Input
            density="outline"
            value={form.participant_phone}
            onChange={(e) => set("participant_phone", e.target.value)}
            placeholder="+971 …"
          />
        </Field>
        <Field label="Assign team">
          <Select
            density="outline"
            value={form.team_id}
            onChange={(e) => set("team_id", e.target.value)}
          >
            <option value="">Unassigned</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Role">
          <Select
            density="outline"
            value={form.role}
            onChange={(e) => set("role", e.target.value as typeof form.role)}
          >
            <option value="player">Player</option>
            <option value="captain">Captain</option>
            <option value="substitute">Substitute</option>
          </Select>
        </Field>

        <Field label="Payment" className="md:col-span-2">
          <SegmentedControl
            ariaLabel="Payment status"
            value={form.payment}
            onChange={(v) => set("payment", v)}
            options={[
              { value: "paid_offline", label: "Cash collected" },
              { value: "pending", label: "Pending" },
              { value: "comp", label: "Comp / VIP" },
            ]}
          />
        </Field>

        <Field label="Notes" className="md:col-span-2">
          <Textarea
            density="outline"
            rows={2}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>
      </div>

      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
        &ldquo;Cash collected&rdquo; records that you took the money and marks the payment
        as awaiting reconciliation. A Super Admin confirms it as paid.
      </p>
    </Modal>
  );
}
