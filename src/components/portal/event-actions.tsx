"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/overlay";
import { Textarea, Field } from "@/components/ui/field";
import { useToast } from "@/components/ui/feedback";
import { submitForApproval, cancelEvent } from "@/lib/actions/organizer";

export function SubmitEventButton({
  eventId,
  disabled,
}: {
  eventId: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  return (
    <Button
      size="sm"
      icon={<Send size={13} />}
      loading={busy}
      disabled={disabled}
      onClick={async () => {
        setBusy(true);
        const res = await submitForApproval(eventId);
        setBusy(false);
        toast(res.ok ? "Submitted for approval" : res.error, res.ok ? "success" : "danger");
        if (res.ok) router.refresh();
      }}
    >
      Submit for approval
    </Button>
  );
}

export function CancelEventButton({
  eventId,
  eventName,
}: {
  eventId: string;
  eventName: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const toast = useToast();

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>
        Cancel event
      </Button>

      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        destructive
        busy={busy}
        title={`Cancel ${eventName}?`}
        confirmLabel="Cancel the event"
        cancelLabel="Keep it"
        onConfirm={async () => {
          setBusy(true);
          const res = await cancelEvent(eventId, reason);
          setBusy(false);
          if (!res.ok) {
            toast(res.error, "danger");
            return;
          }
          setOpen(false);
          toast("Event cancelled and participants notified", "success");
          router.refresh();
        }}
        body={
          <>
            <p className="mb-3 text-[13.5px] leading-relaxed text-ink-2">
              Everyone holding a place is notified immediately, and a refund request is
              opened for anyone who has paid. A Super Admin settles the money.
            </p>
            <Field label="Reason" required hint="Participants will read this.">
              <Textarea
                density="outline"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Venue double-booked by the club"
              />
            </Field>
          </>
        }
      />
    </>
  );
}
