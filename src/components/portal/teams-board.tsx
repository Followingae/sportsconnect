"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/overlay";
import { Field, Input, Select } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/feedback";
import { EmptyState } from "@/components/ui/feedback";
import { createTeam, assignToTeam } from "@/lib/actions/organizer";
import { PARTICIPANT_ROLE } from "@/lib/status";
import type { Enums } from "@/lib/database.types";

type Member = {
  id: string;
  participant_name: string;
  role: Enums<"participant_role">;
  status: Enums<"registration_status">;
  is_captain: boolean;
};

/**
 * Squad board. Sized for real rosters — football 7+3 and cricket 11+3 — not
 * just a two-person padel pair, so each card scrolls internally rather than
 * stretching the column.
 */
export function TeamsBoard({
  eventId,
  teams,
  unassigned,
  teamSize,
  substitutes,
  canEdit,
}: {
  eventId: string;
  teams: { id: string; name: string; members: Member[] }[];
  unassigned: Member[];
  teamSize: number | null;
  substitutes: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [newOpen, setNewOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [assigning, setAssigning] = useState<Member | null>(null);

  const capacity = (teamSize ?? 0) + substitutes;

  return (
    <>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-ink-2">
          {teams.length} team(s)
          {teamSize ? ` · ${teamSize} players${substitutes ? ` + ${substitutes} subs` : ""}` : ""}
          {unassigned.length > 0 && ` · ${unassigned.length} unassigned`}
        </p>
        {canEdit && (
          <Button variant="ink" size="sm" icon={<Plus size={14} />} onClick={() => setNewOpen(true)}>
            New team
          </Button>
        )}
      </div>

      {teams.length === 0 && unassigned.length === 0 ? (
        <div className="rounded-panel border border-line">
          <EmptyState
            title="No teams yet"
            body="Teams appear here as captains register, or you can create one and assign participants."
            actionLabel={canEdit ? "New team" : undefined}
            onAction={() => setNewOpen(true)}
          />
        </div>
      ) : (
        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {teams.map((t) => {
            const active = t.members.filter((m) => m.status !== "cancelled");
            const players = active.filter((m) => m.role !== "substitute");
            const subs = active.filter((m) => m.role === "substitute");
            const complete = teamSize == null || players.length >= teamSize;
            const over = capacity > 0 && active.length > capacity;

            return (
              <section key={t.id} className="overflow-hidden rounded-panel border border-line">
                <header className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
                  <div className="min-w-0">
                    <h3 className="truncate text-[14px] font-extrabold">{t.name}</h3>
                    <p className="text-[11px] text-ink-3">
                      {players.length}
                      {teamSize ? `/${teamSize}` : ""} players
                      {subs.length > 0 ? ` · ${subs.length} sub${subs.length > 1 ? "s" : ""}` : ""}
                    </p>
                  </div>
                  {over ? (
                    <Badge tone="danger">Over capacity</Badge>
                  ) : complete ? (
                    <Badge tone="success">Complete</Badge>
                  ) : (
                    <Badge tone="warning">Incomplete</Badge>
                  )}
                </header>

                <ul className="max-h-[280px] overflow-y-auto p-3">
                  {active.length === 0 && (
                    <li className="px-1 py-2 text-[12.5px] text-ink-3">No players yet.</li>
                  )}
                  {active.map((m) => (
                    <li key={m.id} className="flex items-center gap-2.5 py-1.5">
                      <Avatar name={m.participant_name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold">{m.participant_name}</p>
                        <p className="text-[11px] text-ink-3">
                          {m.is_captain ? "Captain" : PARTICIPANT_ROLE[m.role]}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {/* unassigned column */}
          {unassigned.filter((m) => m.status !== "cancelled").length > 0 && (
            <section className="overflow-hidden rounded-panel border border-dashed border-line-strong">
              <header className="flex items-center justify-between border-b border-line px-4 py-3">
                <h3 className="text-[14px] font-extrabold text-ink-2">Unassigned</h3>
                <Badge tone="warning">
                  {unassigned.filter((m) => m.status !== "cancelled").length}
                </Badge>
              </header>
              <ul className="max-h-[280px] overflow-y-auto p-3">
                {unassigned
                  .filter((m) => m.status !== "cancelled")
                  .map((m) => (
                    <li key={m.id} className="flex items-center gap-2.5 py-1.5">
                      <Avatar name={m.participant_name} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-bold">{m.participant_name}</p>
                        <p className="text-[11px] text-ink-3">
                          {m.status === "waitlisted" ? "Waitlisted" : PARTICIPANT_ROLE[m.role]}
                        </p>
                      </div>
                      {canEdit && teams.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setAssigning(m)}
                          className="shrink-0 rounded-btn-sm border border-line-strong px-2.5 py-1 text-[11.5px] font-bold"
                        >
                          Assign
                        </button>
                      )}
                    </li>
                  ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <Modal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        title="New team"
        width={400}
        footer={
          <>
            <Button variant="ghost" size="md" className="flex-1" onClick={() => setNewOpen(false)}>
              Cancel
            </Button>
            <Button
              size="md"
              className="flex-[2]"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                const res = await createTeam(eventId, name);
                setBusy(false);
                if (!res.ok) {
                  toast(res.error, "danger");
                  return;
                }
                setName("");
                setNewOpen(false);
                toast("Team created", "success");
                router.refresh();
              }}
            >
              Create team
            </Button>
          </>
        }
      >
        <Field label="Team name" required>
          <Input
            density="outline"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Aces"
          />
        </Field>
      </Modal>

      <Modal
        open={Boolean(assigning)}
        onClose={() => setAssigning(null)}
        title={`Assign ${assigning?.participant_name ?? ""}`}
        width={400}
      >
        <Field label="Team">
          <Select
            density="outline"
            defaultValue=""
            onChange={async (e) => {
              if (!assigning || !e.target.value) return;
              const res = await assignToTeam(assigning.id, e.target.value);
              setAssigning(null);
              toast(res.ok ? "Assigned" : res.error, res.ok ? "success" : "danger");
              if (res.ok) router.refresh();
            }}
          >
            <option value="">Choose a team…</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </Field>
        <p className="mt-3 flex items-center gap-2 text-[12px] text-ink-3">
          <UserPlus size={13} aria-hidden />
          They keep their registration and payment status.
        </p>
      </Modal>
    </>
  );
}
