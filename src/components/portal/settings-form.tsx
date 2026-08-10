"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, Banknote, CreditCard } from "lucide-react";
import { Panel } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea, Toggle } from "@/components/ui/field";
import { useToast } from "@/components/ui/feedback";
import { savePlatformSettings } from "@/lib/actions/admin";
import type { Enums } from "@/lib/database.types";

type Settings = {
  bank_account_name: string;
  bank_name: string;
  bank_iban: string;
  bank_swift: string;
  support_email: string;
  support_phone: string;
  default_terms: string;
  default_cancellation_policy: string;
  payment_methods_enabled: Enums<"payment_method">[];
};

export function SettingsForm({ initial }: { initial: Settings }) {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState<Settings>(initial);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    setF((p) => ({ ...p, [k]: v }));

  const toggleMethod = (m: Enums<"payment_method">, on: boolean) =>
    set(
      "payment_methods_enabled",
      on
        ? [...new Set([...f.payment_methods_enabled, m])]
        : f.payment_methods_enabled.filter((x) => x !== m)
    );

  const has = (m: Enums<"payment_method">) => f.payment_methods_enabled.includes(m);

  return (
    <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
      <Panel title="Bank transfer details" subtitle="Shown to consumers on the payment screen">
        <div className="grid gap-3.5 px-4 pb-4">
          <Field label="Account name" required>
            <Input
              density="outline"
              value={f.bank_account_name}
              onChange={(e) => set("bank_account_name", e.target.value)}
              placeholder="Sportsconnect FZ-LLC"
            />
          </Field>
          <Field label="Bank">
            <Input
              density="outline"
              value={f.bank_name}
              onChange={(e) => set("bank_name", e.target.value)}
              placeholder="Emirates NBD"
            />
          </Field>
          <Field label="IBAN" required>
            <Input
              density="outline"
              value={f.bank_iban}
              onChange={(e) => set("bank_iban", e.target.value)}
              placeholder="AE07 0331 2345 6789 0123 456"
            />
          </Field>
          <Field label="SWIFT / BIC">
            <Input
              density="outline"
              value={f.bank_swift}
              onChange={(e) => set("bank_swift", e.target.value)}
              placeholder="EBILAEAD"
            />
          </Field>
          <p className="text-[11.5px] leading-relaxed text-ink-3">
            These appear verbatim on every bank-transfer instruction screen. Get them
            wrong and money goes to the wrong account.
          </p>
        </div>
      </Panel>

      <div className="flex flex-col gap-4">
        <Panel title="Payment methods" subtitle="What consumers may choose">
          <div className="flex flex-col gap-2.5 px-4 pb-4">
            <MethodToggle
              icon={<Landmark size={16} />}
              label="Bank transfer"
              hint="Consumer transfers, you reconcile and mark paid"
              checked={has("bank_transfer")}
              onChange={(v) => toggleMethod("bank_transfer", v)}
            />
            <MethodToggle
              icon={<Banknote size={16} />}
              label="Cash at venue"
              hint="Organizer collects on the platform's behalf"
              checked={has("cash_at_venue")}
              onChange={(v) => toggleMethod("cash_at_venue", v)}
            />
            <div className="flex items-center gap-3 rounded-[12px] border border-line px-3.5 py-3 opacity-60">
              <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-soft">
                <CreditCard size={16} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-bold">Card payment</span>
                <span className="block text-[11px] text-ink-3">
                  Needs a gateway. Not available yet.
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-soft px-2.5 py-1 text-[10.5px] font-bold text-ink-3">
                Coming soon
              </span>
            </div>
          </div>
        </Panel>

        <Panel title="Support contact">
          <div className="grid gap-3.5 px-4 pb-4">
            <Field label="Support email">
              <Input
                density="outline"
                type="email"
                value={f.support_email}
                onChange={(e) => set("support_email", e.target.value)}
                placeholder="support@sportsconnect.ae"
              />
            </Field>
            <Field label="Support phone">
              <Input
                density="outline"
                value={f.support_phone}
                onChange={(e) => set("support_phone", e.target.value)}
              />
            </Field>
          </div>
        </Panel>
      </div>

      <Panel title="Default policies" className="lg:col-span-2">
        <div className="grid gap-3.5 px-4 pb-4 lg:grid-cols-2">
          <Field
            label="Default cancellation policy"
            hint="Pre-filled in the event builder. Organizers can override it."
          >
            <Textarea
              density="outline"
              rows={4}
              value={f.default_cancellation_policy}
              onChange={(e) => set("default_cancellation_policy", e.target.value)}
              placeholder="Full refund if cancelled 48 hours before the start. 50% within 48 hours. No refund after the event starts."
            />
          </Field>
          <Field label="Default terms">
            <Textarea
              density="outline"
              rows={4}
              value={f.default_terms}
              onChange={(e) => set("default_terms", e.target.value)}
            />
          </Field>
        </div>

        <div className="px-4 pb-4">
          <Button
            loading={busy}
            onClick={async () => {
              setBusy(true);
              const res = await savePlatformSettings(f);
              setBusy(false);
              toast(res.ok ? "Settings saved" : res.error, res.ok ? "success" : "danger");
              if (res.ok) router.refresh();
            }}
          >
            Save settings
          </Button>
        </div>
      </Panel>
    </div>
  );
}

function MethodToggle({
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[12px] border border-line px-3.5 py-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-soft">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold">{label}</span>
        <span className="block text-[11px] text-ink-3">{hint}</span>
      </span>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}
