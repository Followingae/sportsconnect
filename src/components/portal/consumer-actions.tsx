"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal, ConfirmDialog } from "@/components/ui/overlay";
import { Field, Input, Textarea, SegmentedControl } from "@/components/ui/field";
import { Chip } from "@/components/ui/chip";
import { useToast } from "@/components/ui/feedback";
import { grantToConsumer, setAccountStatus } from "@/lib/actions/admin";
import { money } from "@/lib/format";
import type { Enums } from "@/lib/database.types";

const CREDIT_PRESETS = [50, 100, 200, 500];
const DISCOUNT_PRESETS = [10, 15, 20, 50];

export function ConsumerActions({
  userId,
  name,
  status,
}: {
  userId: string;
  name: string;
  status: Enums<"account_status">;
}) {
  const router = useRouter();
  const toast = useToast();
  const [grantOpen, setGrantOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [kind, setKind] = useState<"credit" | "discount">("discount");
  const [amount, setAmount] = useState("20");
  const [reason, setReason] = useState("");

  const suspended = status === "suspended";

  return (
    <>
      <Button size="sm" icon={<Gift size={14} />} onClick={() => setGrantOpen(true)}>
        Grant
      </Button>
      <Button
        variant={suspended ? "ghost" : "danger"}
        size="sm"
        onClick={() => setSuspendOpen(true)}
      >
        {suspended ? "Reinstate" : "Suspend"}
      </Button>

      <Modal
        open={grantOpen}
        onClose={() => setGrantOpen(false)}
        title={`Grant to ${name}`}
        description="Account credit or a per-account discount"
        width={440}
        footer={
          <>
            <Button variant="ghost" size="md" className="flex-1" onClick={() => setGrantOpen(false)}>
              Cancel
            </Button>
            <Button
              size="md"
              className="flex-[2]"
              loading={busy}
              onClick={async () => {
                const value = Number(amount);
                setBusy(true);
                const res = await grantToConsumer(
                  userId,
                  kind === "credit"
                    ? { kind: "credit", amount: value }
                    : { kind: "discount", percent: value },
                  reason
                );
                setBusy(false);
                if (!res.ok) {
                  toast(res.error, "danger");
                  return;
                }
                setGrantOpen(false);
                setReason("");
                toast("Granted, consumer notified", "success");
                router.refresh();
              }}
            >
              {kind === "credit"
                ? `Grant ${money(Number(amount) || 0)}`
                : `Grant ${Number(amount) || 0}% off`}
            </Button>
          </>
        }
      >
        <Field label="Type">
          <SegmentedControl
            ariaLabel="Grant type"
            value={kind}
            onChange={(v) => {
              setKind(v);
              setAmount(v === "credit" ? "100" : "20");
            }}
            options={[
              { value: "discount", label: "Discount" },
              { value: "credit", label: "Credit" },
            ]}
          />
        </Field>

        <div className="mt-3.5 flex flex-wrap gap-2">
          {(kind === "credit" ? CREDIT_PRESETS : DISCOUNT_PRESETS).map((p) => (
            <Chip
              key={p}
              selected={Number(amount) === p}
              onClick={() => setAmount(String(p))}
            >
              {kind === "credit" ? money(p) : `${p}%`}
            </Chip>
          ))}
        </div>

        <Field
          label={kind === "credit" ? "Amount (AED)" : "Percentage off"}
          required
          className="mt-3.5"
          hint={
            kind === "discount"
              ? "Replaces any discount they already have."
              : "Added to their balance and spent automatically at checkout."
          }
        >
          <Input
            density="outline"
            type="number"
            min={1}
            max={kind === "discount" ? 100 : undefined}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>

        <Field label="Reason" className="mt-3.5" hint="Shown in the audit log.">
          <Textarea
            density="outline"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Goodwill after the cancelled Sunset Padel Social"
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={suspendOpen}
        onClose={() => setSuspendOpen(false)}
        destructive={!suspended}
        busy={busy}
        title={suspended ? `Reinstate ${name}?` : `Suspend ${name}?`}
        confirmLabel={suspended ? "Reinstate" : "Suspend"}
        body={
          suspended
            ? "They can sign in and register again straight away."
            : "They can't sign in or register while suspended. Existing registrations are untouched."
        }
        onConfirm={async () => {
          setBusy(true);
          const res = await setAccountStatus(userId, suspended ? "active" : "suspended");
          setBusy(false);
          setSuspendOpen(false);
          toast(res.ok ? "Updated" : res.error, res.ok ? "success" : "danger");
          if (res.ok) router.refresh();
        }}
      />
    </>
  );
}
