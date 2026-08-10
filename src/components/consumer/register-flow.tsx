"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronLeft,
  Copy,
  Check,
  Landmark,
  Banknote,
  CreditCard,
  Upload,
  Clock,
} from "lucide-react";
import { Field, Input, Select, Textarea, Checkbox } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card, Divider } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { useToast } from "@/components/ui/feedback";
import { money, formatDateTime } from "@/lib/format";
import { computePrice, type FeeConfig } from "@/lib/pricing";
import { registerForEvent, reportTransferSent } from "@/lib/actions/registration";
import { cn } from "@/lib/cn";
import type { Enums } from "@/lib/database.types";

type Question = {
  id: string;
  label: string;
  help_text: string | null;
  type: Enums<"question_type">;
  options: unknown;
  is_required: boolean;
};

type BankDetails = {
  account_name: string | null;
  bank_name: string | null;
  iban: string | null;
  swift: string | null;
};

export type RegisterFlowProps = {
  event: {
    id: string;
    slug: string;
    name: string;
    starts_at: string;
    registration_closes_at: string | null;
    price_amount: number;
    price_unit: string;
    currency: string;
    tax_percent: number;
    registration_model: Enums<"registration_model">;
    venue_name: string | null;
    cancellation_policy: string | null;
    teamSize: number | null;
    substitutes: number;
  };
  questions: Question[];
  fee: FeeConfig;
  perks: { creditTotal: number; discountPercent: number };
  bank: BankDetails;
  viewerName: string;
  waitlistMode: boolean;
};

type Step = "team" | "questions" | "review" | "method" | "instructions" | "done";

export function RegisterFlow(props: RegisterFlowProps) {
  const { event, questions, fee, perks, bank, viewerName, waitlistMode } = props;
  const router = useRouter();
  const toast = useToast();

  const isTeam = event.registration_model === "team";
  const steps: Step[] = useMemo(() => {
    const s: Step[] = [];
    if (isTeam) s.push("team");
    if (questions.length) s.push("questions");
    s.push("review", "method", "instructions", "done");
    return s;
  }, [isTeam, questions.length]);

  const [stepIndex, setStepIndex] = useState(0);
  const step = steps[stepIndex];
  const progressSteps = steps.filter((s) => s !== "done");

  const [teamName, setTeamName] = useState("");
  const [teammates, setTeammates] = useState<
    { name: string; email: string; phone: string; role: "player" | "substitute" }[]
  >([]);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [accepted, setAccepted] = useState(false);
  const [method, setMethod] = useState<"bank_transfer" | "cash_at_venue">("bank_transfer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ reference: string; id: string; waitlisted: boolean } | null>(
    null
  );
  const [payerRef, setPayerRef] = useState("");

  const price = useMemo(
    () =>
      computePrice({
        baseAmount: event.price_amount,
        quantity: 1,
        discountPercent: perks.discountPercent,
        creditAmount: perks.creditTotal,
        taxPercent: event.tax_percent,
        fee,
      }),
    [event.price_amount, event.tax_percent, fee, perks]
  );

  const back = () => (stepIndex === 0 ? router.back() : setStepIndex((i) => i - 1));
  const next = () => setStepIndex((i) => Math.min(i + 1, steps.length - 1));

  function validateQuestions(): string | null {
    for (const q of questions) {
      if (!q.is_required) continue;
      const v = answers[q.id];
      const empty =
        v == null ||
        v === "" ||
        (Array.isArray(v) && v.length === 0) ||
        (q.type === "checkbox" && v !== true);
      if (empty) return `${q.label} is required.`;
    }
    return null;
  }

  async function submit() {
    setBusy(true);
    setError(null);

    const res = await registerForEvent({
      eventId: event.id,
      teamName: isTeam ? teamName : undefined,
      teammates: isTeam ? teammates.filter((t) => t.name.trim()) : undefined,
      answers,
      method,
      acceptTerms: true,
      joinWaitlist: waitlistMode,
    });

    setBusy(false);

    if (!res.ok) {
      setError(res.error);
      return;
    }
    setResult({ reference: res.reference, id: res.registrationId, waitlisted: res.waitlisted });
    setStepIndex(steps.indexOf("instructions"));
  }

  /* ------------------------------------------------------------------ */

  return (
    <div className="pb-40">
      <header className="flex items-center gap-3 px-5 pt-4">
        {step !== "done" && (
          <button
            type="button"
            onClick={back}
            aria-label="Back"
            className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-soft"
          >
            <ChevronLeft size={18} aria-hidden />
          </button>
        )}
        {step !== "done" && (
          <div className="flex flex-1 gap-1.5" role="progressbar"
               aria-valuenow={stepIndex + 1} aria-valuemin={1} aria-valuemax={progressSteps.length}
               aria-label={`Step ${stepIndex + 1} of ${progressSteps.length}`}>
            {progressSteps.map((s, i) => (
              <span
                key={s}
                className={cn(
                  "h-1 flex-1 rounded-full",
                  i <= stepIndex ? "bg-volt" : "bg-line"
                )}
              />
            ))}
          </div>
        )}
      </header>

      <div className="px-5">
        {error && (
          <p role="alert" className="mt-4 rounded-[12px] bg-danger-wash px-3.5 py-3 text-[13px] font-semibold text-danger">
            {error}
          </p>
        )}

        {step === "team" && (
          <StepTeam
            event={event}
            viewerName={viewerName}
            teamName={teamName}
            setTeamName={setTeamName}
            teammates={teammates}
            setTeammates={setTeammates}
          />
        )}

        {step === "questions" && (
          <StepQuestions questions={questions} answers={answers} setAnswers={setAnswers} />
        )}

        {step === "review" && (
          <StepReview
            event={event}
            price={price}
            perks={perks}
            fee={fee}
            teamName={teamName}
            teammateCount={teammates.filter((t) => t.name.trim()).length}
            accepted={accepted}
            setAccepted={setAccepted}
            waitlistMode={waitlistMode}
          />
        )}

        {step === "method" && (
          <StepMethod method={method} setMethod={setMethod} closesAt={event.registration_closes_at} />
        )}

        {step === "instructions" && result && (
          <StepInstructions
            method={method}
            total={price.total}
            currency={event.currency}
            reference={result.reference}
            bank={bank}
            event={event}
            payerRef={payerRef}
            setPayerRef={setPayerRef}
            waitlisted={result.waitlisted}
          />
        )}

        {step === "done" && result && (
          <StepDone
            event={event}
            reference={result.reference}
            total={price.total}
            currency={event.currency}
            method={method}
            waitlisted={result.waitlisted}
          />
        )}
      </div>

      {/* ---------------- sticky action ---------------- */}
      <div
        className="stick-fade fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[560px] px-5 pt-7"
        style={{ paddingBottom: "calc(var(--nav-clearance) + 4px)" }}
      >
        {step === "team" && (
          <Button size="lg" block disabled={!teamName.trim()} onClick={next}>
            Continue
          </Button>
        )}
        {step === "questions" && (
          <Button
            size="lg"
            block
            onClick={() => {
              const err = validateQuestions();
              if (err) {
                setError(err);
                return;
              }
              setError(null);
              next();
            }}
          >
            Continue
          </Button>
        )}
        {step === "review" && (
          <Button size="lg" block disabled={!accepted} onClick={next}>
            Continue to payment
          </Button>
        )}
        {step === "method" && (
          <Button size="lg" block loading={busy} onClick={submit}>
            {waitlistMode ? "Join the waitlist" : "Confirm registration"}
          </Button>
        )}
        {step === "instructions" && (
          <Button
            size="lg"
            block
            loading={busy}
            onClick={async () => {
              if (method === "bank_transfer" && result) {
                setBusy(true);
                const r = await reportTransferSent(result.id, payerRef);
                setBusy(false);
                if (!r.ok) {
                  toast(r.error ?? "Couldn't record that", "danger");
                  return;
                }
                toast("Sent for verification", "success");
              }
              setStepIndex(steps.indexOf("done"));
            }}
          >
            {method === "bank_transfer" ? "I've made the transfer" : "Got it"}
          </Button>
        )}
        {step === "done" && (
          <div className="flex flex-col gap-2.5">
            <Button size="lg" block onClick={() => router.push("/my-events")}>
              View registration
            </Button>
            <Link href={`/e/${event.slug}`}>
              <Button size="lg" block variant="ghost">
                Back to event
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

/* ==================================================================== steps */

function StepTeam({
  event,
  viewerName,
  teamName,
  setTeamName,
  teammates,
  setTeammates,
}: {
  event: RegisterFlowProps["event"];
  viewerName: string;
  teamName: string;
  setTeamName: (v: string) => void;
  teammates: { name: string; email: string; phone: string; role: "player" | "substitute" }[];
  setTeammates: (
    v: { name: string; email: string; phone: string; role: "player" | "substitute" }[]
  ) => void;
}) {
  const squadTarget = event.teamSize ?? 2;
  const filled = 1 + teammates.length;

  return (
    <section className="mt-5">
      <h1 className="text-h2">Your team</h1>
      <p className="mt-2 text-meta text-ink-2">
        {squadTarget > 2
          ? `Squads of ${squadTarget}${event.substitutes ? ` plus up to ${event.substitutes} substitutes` : ""}. You can add the rest later.`
          : "Name your team and add your partner."}
      </p>

      <Field label="Team name" htmlFor="teamName" required className="mt-5">
        <Input
          id="teamName"
          value={teamName}
          onChange={(e) => setTeamName(e.target.value)}
          placeholder="Aces"
          maxLength={60}
        />
      </Field>

      <p className="mt-5 text-[12px] font-bold uppercase tracking-wide text-ink-3">
        Squad · {filled}/{squadTarget}
      </p>

      <div className="mt-2.5 flex items-center gap-3 rounded-[14px] bg-soft px-3.5 py-3">
        <span className="grid size-9 place-items-center rounded-full bg-av-1 text-[13px] font-extrabold text-white">
          {viewerName[0]?.toUpperCase() ?? "?"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-[14px] font-extrabold">{viewerName}</p>
          <p className="text-[12px] text-ink-2">Captain · you</p>
        </div>
      </div>

      {teammates.map((m, i) => (
        <div key={i} className="mt-2.5 rounded-[14px] border border-line p-3.5">
          <div className="flex items-start gap-3">
            <div className="flex-1 space-y-2.5">
              <Input
                aria-label={`Teammate ${i + 2} name`}
                value={m.name}
                onChange={(e) => {
                  const copy = [...teammates];
                  copy[i] = { ...copy[i], name: e.target.value };
                  setTeammates(copy);
                }}
                placeholder="Full name"
              />
              <div className="flex gap-2.5">
                <Input
                  aria-label={`Teammate ${i + 2} email`}
                  type="email"
                  value={m.email}
                  onChange={(e) => {
                    const copy = [...teammates];
                    copy[i] = { ...copy[i], email: e.target.value };
                    setTeammates(copy);
                  }}
                  placeholder="Email (optional)"
                />
                <Select
                  aria-label={`Teammate ${i + 2} role`}
                  value={m.role}
                  onChange={(e) => {
                    const copy = [...teammates];
                    copy[i] = { ...copy[i], role: e.target.value as "player" | "substitute" };
                    setTeammates(copy);
                  }}
                  className="w-[140px]"
                >
                  <option value="player">Player</option>
                  <option value="substitute">Substitute</option>
                </Select>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setTeammates(teammates.filter((_, j) => j !== i))}
              className="text-[12px] font-bold text-danger"
            >
              Remove
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() =>
          setTeammates([...teammates, { name: "", email: "", phone: "", role: "player" }])
        }
        className="mt-2.5 flex w-full items-center gap-3 rounded-[14px] border-[1.5px] border-dashed border-line-strong px-3.5 py-3 text-left"
      >
        <span className="grid size-9 place-items-center rounded-full border border-line text-[18px] text-ink-3">
          +
        </span>
        <span>
          <span className="block text-[14px] font-extrabold">Add teammate</span>
          <span className="block text-[12px] text-ink-2">Name, and email if you have it</span>
        </span>
      </button>
    </section>
  );
}

function StepQuestions({
  questions,
  answers,
  setAnswers,
}: {
  questions: Question[];
  answers: Record<string, unknown>;
  setAnswers: (v: Record<string, unknown>) => void;
}) {
  const set = (id: string, v: unknown) => setAnswers({ ...answers, [id]: v });

  return (
    <section className="mt-5">
      <h1 className="text-h2">A few questions</h1>
      <p className="mt-2 text-meta text-ink-2">Set by the organizer for this event.</p>

      <div className="mt-5 flex flex-col gap-5">
        {questions.map((q) => {
          const opts = Array.isArray(q.options) ? (q.options as string[]) : [];
          const value = answers[q.id];

          return (
            <Field
              key={q.id}
              label={q.label}
              htmlFor={`q-${q.id}`}
              required={q.is_required}
              hint={q.help_text ?? undefined}
            >
              {q.type === "text" && (
                <Textarea
                  id={`q-${q.id}`}
                  rows={3}
                  value={(value as string) ?? ""}
                  onChange={(e) => set(q.id, e.target.value)}
                />
              )}
              {q.type === "number" && (
                <Input
                  id={`q-${q.id}`}
                  type="number"
                  value={(value as string) ?? ""}
                  onChange={(e) => set(q.id, e.target.value)}
                />
              )}
              {q.type === "date" && (
                <Input
                  id={`q-${q.id}`}
                  type="date"
                  value={(value as string) ?? ""}
                  onChange={(e) => set(q.id, e.target.value)}
                />
              )}
              {q.type === "dropdown" && (
                <Select
                  id={`q-${q.id}`}
                  value={(value as string) ?? ""}
                  onChange={(e) => set(q.id, e.target.value)}
                >
                  <option value="">Select…</option>
                  {opts.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </Select>
              )}
              {q.type === "multiple_choice" && (
                <div className="flex flex-wrap gap-2">
                  {opts.map((o) => (
                    <Chip key={o} selected={value === o} onClick={() => set(q.id, o)}>
                      {o}
                    </Chip>
                  ))}
                </div>
              )}
              {q.type === "checkbox" && (
                <Checkbox
                  id={`q-${q.id}`}
                  label={q.help_text ?? "Yes"}
                  checked={value === true}
                  onChange={(e) => set(q.id, e.currentTarget.checked)}
                />
              )}
              {q.type === "file" && (
                <p className="rounded-field bg-soft px-4 py-3 text-[13px] text-ink-2">
                  File uploads aren&apos;t supported yet — the organizer will ask for this by
                  email.
                </p>
              )}
            </Field>
          );
        })}
      </div>
    </section>
  );
}

function StepReview({
  event,
  price,
  perks,
  fee,
  teamName,
  teammateCount,
  accepted,
  setAccepted,
  waitlistMode,
}: {
  event: RegisterFlowProps["event"];
  price: ReturnType<typeof computePrice>;
  perks: { creditTotal: number; discountPercent: number };
  fee: FeeConfig;
  teamName: string;
  teammateCount: number;
  accepted: boolean;
  setAccepted: (v: boolean) => void;
  waitlistMode: boolean;
}) {
  const c = event.currency;
  const feeLabel =
    fee.mode === "percentage"
      ? `Platform fee (${fee.percentage}%)`
      : fee.mode === "none"
        ? null
        : "Platform fee";

  return (
    <section className="mt-5">
      <h1 className="text-h2">Review</h1>

      <Card className="mt-4 p-4">
        <p className="text-[15px] font-extrabold">{event.name}</p>
        <p className="mt-1 text-[12.5px] text-ink-2">
          {teamName ? `Team ${teamName} · ${teammateCount + 1} players · ` : ""}
          {formatDateTime(event.starts_at)}
        </p>

        <Divider className="my-3.5" />

        <Row label={event.price_unit === "per_team" ? "Entry fee (team)" : "Entry fee"}
             value={money(price.subtotal, c)} />
        {price.discount > 0 && (
          <Row
            label={`Member discount (${perks.discountPercent}%)`}
            value={`− ${money(price.discount, c)}`}
            accent
          />
        )}
        {feeLabel && <Row label={feeLabel} value={money(price.platformFee, c)} />}
        {price.tax > 0 && (
          <Row label={`VAT (${event.tax_percent}%)`} value={money(price.tax, c)} />
        )}
        {price.creditApplied > 0 && (
          <Row label="Account credit" value={`− ${money(price.creditApplied, c)}`} accent />
        )}

        <Divider className="my-3" />
        <div className="flex items-center justify-between">
          <span className="text-[14px] font-bold">Total</span>
          <span className="text-[20px] font-extrabold tabular-nums">
            {money(price.total, c)}
          </span>
        </div>
      </Card>

      {waitlistMode && (
        <p className="mt-3 rounded-[12px] bg-info-wash px-3.5 py-3 text-[12.5px] font-semibold text-info">
          You&apos;re joining the waitlist. You won&apos;t be asked to pay until a place opens
          up.
        </p>
      )}

      {event.cancellation_policy && (
        <div className="mt-4">
          <p className="text-[12px] font-bold uppercase tracking-wide text-ink-3">
            Cancellation &amp; refunds
          </p>
          <p className="mt-1.5 whitespace-pre-line text-[13px] leading-relaxed text-ink-2">
            {event.cancellation_policy}
          </p>
        </div>
      )}

      <div className="mt-4">
        <Checkbox
          checked={accepted}
          onChange={(e) => setAccepted(e.currentTarget.checked)}
          label="I accept the event terms and the cancellation & refund policy."
        />
      </div>
    </section>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="mb-2 flex justify-between text-[13.5px] last:mb-0">
      <span className="text-ink-2">{label}</span>
      <span className={cn("tabular-nums", accent && "font-semibold text-volt-deep")}>
        {value}
      </span>
    </div>
  );
}

function StepMethod({
  method,
  setMethod,
  closesAt,
}: {
  method: string;
  setMethod: (m: "bank_transfer" | "cash_at_venue") => void;
  closesAt: string | null;
}) {
  return (
    <section className="mt-5">
      <h1 className="text-h2">How would you like to pay?</h1>
      <p className="mt-2 text-meta text-ink-2">
        {closesAt
          ? `Your place is held until registration closes on ${formatDateTime(closesAt)}.`
          : "Your place is held until registration closes."}
      </p>

      <div className="mt-5 flex flex-col gap-3">
        <MethodTile
          selected={method === "bank_transfer"}
          onClick={() => setMethod("bank_transfer")}
          icon={<Landmark size={18} />}
          title="Bank transfer"
          blurb="Get account details and your reference"
        />
        <MethodTile
          selected={method === "cash_at_venue"}
          onClick={() => setMethod("cash_at_venue")}
          icon={<Banknote size={18} />}
          title="Cash at venue"
          blurb="Pay the organizer on arrival"
        />
        <div className="flex items-center gap-3 rounded-[16px] border border-line p-3.5 opacity-55">
          <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-soft">
            <CreditCard size={18} aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-extrabold">Pay by card</p>
            <p className="text-[12px] text-ink-2">Visa · Mastercard</p>
          </div>
          <span className="shrink-0 rounded-full bg-soft px-2.5 py-1 text-[11px] font-bold text-ink-3">
            Coming soon
          </span>
        </div>
      </div>
    </section>
  );
}

function MethodTile({
  selected,
  onClick,
  icon,
  title,
  blurb,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  blurb: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex items-center gap-3 rounded-[16px] p-3.5 text-left transition-colors",
        selected ? "border-2 border-volt" : "border border-line"
      )}
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-soft">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-extrabold">{title}</span>
        <span className="block text-[12px] text-ink-2">{blurb}</span>
      </span>
      <span
        className={cn(
          "grid size-5 shrink-0 place-items-center rounded-full text-[12px] font-extrabold",
          selected ? "bg-volt text-ink" : "border-2 border-line"
        )}
      >
        {selected ? "✓" : ""}
      </span>
    </button>
  );
}

function StepInstructions({
  method,
  total,
  currency,
  reference,
  bank,
  event,
  payerRef,
  setPayerRef,
  waitlisted,
}: {
  method: string;
  total: number;
  currency: string;
  reference: string;
  bank: BankDetails;
  event: RegisterFlowProps["event"];
  payerRef: string;
  setPayerRef: (v: string) => void;
  waitlisted: boolean;
}) {
  if (waitlisted) {
    return (
      <section className="mt-5">
        <h1 className="text-h2">You&apos;re on the waitlist</h1>
        <p className="mt-2 text-meta text-ink-2">
          We&apos;ll email you the moment a place opens up. You won&apos;t be charged
          anything until you accept it.
        </p>
        <Card className="mt-4 p-4">
          <div className="flex justify-between text-[13.5px]">
            <span className="text-ink-2">Reference</span>
            <span className="font-bold text-volt-deep">{reference}</span>
          </div>
        </Card>
      </section>
    );
  }

  if (method === "cash_at_venue") {
    return (
      <section className="mt-5">
        <h1 className="text-h2">Pay at the venue</h1>
        <Card className="mt-4 p-4">
          <div className="mb-2.5 flex justify-between text-[13.5px]">
            <span className="text-ink-2">Bring</span>
            <span className="text-[16px] font-extrabold tabular-nums">
              {money(total, currency)}
            </span>
          </div>
          <div className="mb-2.5 flex justify-between text-[13.5px]">
            <span className="text-ink-2">Pay</span>
            <span className="font-semibold">Organizer desk</span>
          </div>
          <div className="flex justify-between text-[13.5px]">
            <span className="text-ink-2">Venue</span>
            <span className="font-semibold">{event.venue_name ?? "See event page"}</span>
          </div>
          <Divider className="my-3" />
          <div className="flex justify-between text-[13.5px]">
            <span className="text-ink-2">Reference</span>
            <span className="font-bold text-volt-deep">{reference}</span>
          </div>
        </Card>
        <p className="mt-3.5 rounded-[12px] bg-warning-wash px-3.5 py-3 text-[12.5px] font-semibold text-warning">
          Your place is held as Pending until the organizer records the cash.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-5">
      <h1 className="text-h2">Transfer to confirm</h1>

      <p className="mt-3 flex items-center gap-2 rounded-[12px] bg-warning-wash px-3.5 py-3 text-[12.5px] font-semibold text-warning">
        <Clock size={14} aria-hidden />
        {event.registration_closes_at
          ? `Place held until registration closes, ${formatDateTime(event.registration_closes_at)}`
          : "Place held until registration closes"}
      </p>

      <Card className="mt-3.5 px-4 py-1">
        <CopyRow label="Amount" value={money(total, currency)} big />
        <CopyRow label="Reference (must include)" value={reference} accent />
        <CopyRow label="Account name" value={bank.account_name ?? "—"} />
        <CopyRow label="Bank" value={bank.bank_name ?? "—"} copyable={false} />
        <CopyRow label="IBAN" value={bank.iban ?? "—"} />
        <CopyRow label="SWIFT / BIC" value={bank.swift ?? "—"} last />
      </Card>

      <Field
        label="Your bank's reference (optional)"
        htmlFor="payerRef"
        hint="If your bank generated its own reference, add it here — it speeds up matching."
        className="mt-5"
      >
        <Input
          id="payerRef"
          value={payerRef}
          onChange={(e) => setPayerRef(e.target.value)}
          placeholder="e.g. TRF8837201"
        />
      </Field>

      <div className="mt-4 flex items-center gap-3 rounded-[16px] border-[1.5px] border-dashed border-line-strong px-4 py-4 text-ink-3">
        <Upload size={18} aria-hidden />
        <p className="text-[12.5px]">
          Proof-of-payment upload is coming shortly — for now the reference above is enough.
        </p>
      </div>
    </section>
  );
}

function CopyRow({
  label,
  value,
  big,
  accent,
  last,
  copyable = true,
}: {
  label: string;
  value: string;
  big?: boolean;
  accent?: boolean;
  last?: boolean;
  copyable?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 py-3",
        !last && "border-b border-line"
      )}
    >
      <div className="min-w-0">
        <p className="text-[11px] text-ink-3">{label}</p>
        <p
          className={cn(
            "mt-0.5 break-all",
            big ? "text-[16px] font-extrabold tabular-nums" : "text-[13.5px] font-semibold",
            accent && "font-bold text-volt-deep"
          )}
        >
          {value}
        </p>
      </div>
      {copyable && (
        <button
          type="button"
          aria-label={`Copy ${label}`}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              toast(`${label} copied`, "success");
              setTimeout(() => setCopied(false), 1800);
            } catch {
              toast("Couldn't copy — select and copy manually", "danger");
            }
          }}
          className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-ink-2"
        >
          {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      )}
    </div>
  );
}

function StepDone({
  event,
  reference,
  total,
  currency,
  method,
  waitlisted,
}: {
  event: RegisterFlowProps["event"];
  reference: string;
  total: number;
  currency: string;
  method: string;
  waitlisted: boolean;
}) {
  return (
    <section className="mt-8 text-center">
      <div
        className={cn(
          "mx-auto grid size-20 place-items-center rounded-full text-[32px]",
          waitlisted ? "bg-info-wash text-info" : "bg-warning-wash text-warning"
        )}
      >
        {waitlisted ? "☰" : "⏳"}
      </div>

      <h1 className="mt-6 text-h2">
        {waitlisted ? "You're on the waitlist" : "You're in, pending payment"}
      </h1>
      <p className="mt-2.5 text-meta text-ink-2">
        {waitlisted
          ? `We'll email you if a place opens up for ${event.name}.`
          : method === "bank_transfer"
            ? "We'll confirm by email once your transfer is verified. No receipt is issued until then."
            : "We'll confirm once the organizer records your cash payment at the venue."}
      </p>

      <Card className="mt-6 p-4 text-left">
        <div className="flex justify-between">
          <span className="text-[13px] text-ink-2">Reference</span>
          <span className="text-[13.5px] font-bold">{reference}</span>
        </div>
        <Divider className="my-3" />
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-ink-2">Status</span>
          <span className="rounded-full bg-warning-wash px-2.5 py-1 text-[11.5px] font-semibold text-warning">
            ● {waitlisted ? "Waitlisted" : "Pending payment"}
          </span>
        </div>
        {!waitlisted && (
          <div className="mt-2.5 flex justify-between">
            <span className="text-[13px] text-ink-2">Amount due</span>
            <span className="text-[13.5px] font-bold tabular-nums">
              {money(total, currency)}
            </span>
          </div>
        )}
      </Card>
    </section>
  );
}
