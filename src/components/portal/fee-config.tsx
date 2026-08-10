"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Panel, Divider } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/feedback";
import { setPlatformFee } from "@/lib/actions/admin";
import { computePlatformFee, round2 } from "@/lib/pricing";
import { money } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Enums } from "@/lib/database.types";

const MODES: { value: Enums<"fee_mode">; label: string; hint: string }[] = [
  { value: "none", label: "No platform fee", hint: "Consumers pay the entry fee only" },
  { value: "fixed", label: "Fixed amount", hint: "Same amount on every registration" },
  { value: "percentage", label: "Percentage", hint: "A share of the entry fee" },
  { value: "fixed_plus_percentage", label: "Fixed + percentage", hint: "Both, added together" },
];

/** BRD §17 — the fee is configuration, with a live worked example. */
export function FeeConfigPanel({
  initial,
}: {
  initial: { mode: Enums<"fee_mode">; fixed_amount: number; percentage: number };
}) {
  const router = useRouter();
  const toast = useToast();
  const [mode, setMode] = useState(initial.mode);
  const [fixed, setFixed] = useState(String(initial.fixed_amount));
  const [pct, setPct] = useState(String(initial.percentage));
  const [busy, setBusy] = useState(false);

  const sample = 100;
  const fee = computePlatformFee(sample, {
    mode,
    fixed_amount: Number(fixed) || 0,
    percentage: Number(pct) || 0,
  });

  return (
    <Panel title="Platform fee" subtitle="Applies to every registration">
      <div className="px-4 pb-4">
        <div className="flex flex-col gap-2">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={cn(
                "flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-left",
                mode === m.value ? "border-2 border-volt" : "border border-line"
              )}
            >
              <span
                className={cn(
                  "size-4 shrink-0 rounded-full",
                  mode === m.value ? "border-[5px] border-volt" : "border-2 border-line-strong"
                )}
              />
              <span className="min-w-0 flex-1">
                <span className="block text-[12.5px] font-bold">{m.label}</span>
                <span className="block text-[11px] text-ink-3">{m.hint}</span>
              </span>
            </button>
          ))}
        </div>

        {(mode === "fixed" || mode === "fixed_plus_percentage") && (
          <Field label="Fixed amount (AED)" className="mt-3.5">
            <Input
              density="outline"
              type="number"
              min={0}
              step="0.01"
              value={fixed}
              onChange={(e) => setFixed(e.target.value)}
            />
          </Field>
        )}
        {(mode === "percentage" || mode === "fixed_plus_percentage") && (
          <Field label="Percentage" className="mt-3.5">
            <Input
              density="outline"
              type="number"
              min={0}
              max={100}
              step="0.01"
              value={pct}
              onChange={(e) => setPct(e.target.value)}
            />
          </Field>
        )}

        <div className="mt-3.5 rounded-[12px] bg-soft p-3.5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-ink-3">
            Worked example
          </p>
          <Row label="Entry fee" value={money(sample)} />
          <Row label="Platform fee" value={money(fee)} />
          <Divider className="my-2" />
          <Row label="Consumer pays" value={money(round2(sample + fee))} bold />
        </div>

        <Button
          className="mt-3.5"
          block
          loading={busy}
          onClick={async () => {
            setBusy(true);
            const res = await setPlatformFee({
              mode,
              fixed_amount: Number(fixed) || 0,
              percentage: Number(pct) || 0,
            });
            setBusy(false);
            toast(res.ok ? "Platform fee updated" : res.error, res.ok ? "success" : "danger");
            if (res.ok) router.refresh();
          }}
        >
          Save platform fee
        </Button>

        <p className="mt-2.5 text-[11px] leading-relaxed text-ink-3">
          Changing this affects new registrations only. Existing payments keep the fee
          that was quoted when they were made.
        </p>
      </div>
    </Panel>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between text-[12.5px]">
      <span className="text-ink-2">{label}</span>
      <span className={cn("tabular-nums", bold ? "font-extrabold" : "font-semibold")}>
        {value}
      </span>
    </div>
  );
}
