"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlay";
import { Field, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/feedback";
import { setEventStatus, toggleFeatured } from "@/lib/actions/admin";
import { EVENT_TRANSITIONS } from "@/lib/status";
import type { Enums } from "@/lib/database.types";

/** BRD §20 verbs, filtered to the transitions legal from the current status. */
export function EventRowActions({
  eventId,
  slug,
  name,
  status,
  featured,
}: {
  eventId: string;
  slug: string;
  name: string;
  status: Enums<"event_status">;
  featured: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");

  const allowed = EVENT_TRANSITIONS[status] ?? [];
  const isPublic = [
    "published",
    "registration_open",
    "registration_closed",
    "sold_out",
    "completed",
  ].includes(status);

  async function move(target: Enums<"event_status">) {
    setBusy(true);
    const res = await setEventStatus(eventId, target);
    setBusy(false);
    toast(res.ok ? `Moved to ${target.replace(/_/g, " ")}` : res.error, res.ok ? "success" : "danger");
    if (res.ok) router.refresh();
  }

  const ALL_ACTIONS = [
    { target: "published", label: "Publish" },
    { target: "registration_open", label: "Open registration" },
    { target: "registration_closed", label: "Close registration" },
    { target: "suspended", label: "Suspend" },
    { target: "completed", label: "Mark completed" },
    { target: "archived", label: "Archive" },
  ] as const satisfies readonly { target: Enums<"event_status">; label: string }[];

  const primary = ALL_ACTIONS.filter((a) => allowed.includes(a.target));

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      {isPublic && (
        <Link
          href={`/e/${slug}`}
          className="rounded-btn-sm border border-line-strong px-2.5 py-1.5 text-[11.5px] font-bold"
        >
          View
        </Link>
      )}

      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          const res = await toggleFeatured(eventId, !featured);
          setBusy(false);
          toast(res.ok ? (featured ? "Unfeatured" : "Featured") : res.error, res.ok ? "success" : "danger");
          if (res.ok) router.refresh();
        }}
        className="rounded-btn-sm border border-line-strong px-2.5 py-1.5 text-[11.5px] font-bold disabled:opacity-50"
      >
        {featured ? "Unfeature" : "Feature"}
      </button>

      {primary.slice(0, 1).map((a) => (
        <Button key={a.target} variant="ink" size="sm" loading={busy} onClick={() => move(a.target)}>
          {a.label}
        </Button>
      ))}

      {allowed.includes("cancelled") && (
        <Button variant="danger" size="sm" onClick={() => setCancelOpen(true)}>
          Cancel
        </Button>
      )}

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        destructive
        busy={busy}
        title={`Cancel ${name}?`}
        confirmLabel="Cancel the event"
        cancelLabel="Keep it"
        onConfirm={async () => {
          if (!reason.trim()) {
            toast("Give a reason — participants will see it.", "danger");
            return;
          }
          setBusy(true);
          const res = await setEventStatus(eventId, "cancelled", reason);
          setBusy(false);
          if (!res.ok) {
            toast(res.error, "danger");
            return;
          }
          setCancelOpen(false);
          toast("Event cancelled", "success");
          router.refresh();
        }}
        body={
          <>
            <p className="mb-3 text-[13.5px] leading-relaxed text-ink-2">
              The organizer and every participant are notified. Refund requests are opened
              for anyone who has paid.
            </p>
            <Field label="Reason" required>
              <Textarea
                density="outline"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Field>
          </>
        }
      />
    </div>
  );
}
