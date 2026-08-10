"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { ConfirmDialog } from "@/components/ui/overlay";
import { useToast } from "@/components/ui/feedback";
import { decideEvent } from "@/lib/actions/admin";

/** Approve · request changes · reject. Both refusals require a note. */
export function ReviewDecision({
  eventId,
  blocked,
}: {
  eventId: string;
  blocked: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);

  async function decide(decision: "approve" | "request_changes" | "reject") {
    setBusy(true);
    const res = await decideEvent(eventId, decision, note);
    setBusy(false);
    if (!res.ok) {
      toast(res.error, "danger");
      return;
    }
    setConfirmReject(false);
    toast(
      decision === "approve"
        ? "Approved — it can now be published"
        : decision === "reject"
          ? "Rejected, organizer notified"
          : "Changes requested, organizer notified",
      "success"
    );
    router.push("/admin/approvals");
    router.refresh();
  }

  return (
    <>
      <Field
        label="Note for the organizer"
        hint="Required when rejecting or requesting changes."
      >
        <Textarea
          density="outline"
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="The banner is low resolution — please replace it with something at least 1600px wide."
        />
      </Field>

      <Button
        variant="success"
        size="md"
        block
        className="mt-3"
        loading={busy}
        disabled={blocked}
        onClick={() => decide("approve")}
      >
        Approve
      </Button>
      {blocked && (
        <p className="mt-1.5 text-[11.5px] text-warning">
          Required fields are missing — request changes instead.
        </p>
      )}

      <div className="mt-2.5 flex gap-2.5">
        <Button
          variant="ghost"
          size="md"
          className="flex-1"
          loading={busy}
          onClick={() => decide("request_changes")}
        >
          Request changes
        </Button>
        <Button
          variant="danger"
          size="md"
          className="flex-1"
          onClick={() => setConfirmReject(true)}
        >
          Reject
        </Button>
      </div>

      <ConfirmDialog
        open={confirmReject}
        onClose={() => setConfirmReject(false)}
        destructive
        busy={busy}
        title="Reject this event?"
        confirmLabel="Reject it"
        body="The organizer is notified and the event stays private. They can revise it and resubmit."
        onConfirm={() => decide("reject")}
      />
    </>
  );
}
