"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Send, Save, AlertCircle } from "lucide-react";
import { Field, Input, Textarea, Select, SegmentedControl, Checkbox } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Panel, Divider } from "@/components/ui/card";
import { Chip, Tag } from "@/components/ui/chip";
import { useToast } from "@/components/ui/feedback";
import { Cover } from "@/components/ui/cover";
import {
  saveEventDraft,
  submitForApproval,
  type EventDraftInput,
} from "@/lib/actions/organizer";
import { validateForSubmission } from "@/lib/event-validation";
import { computePrice, type FeeConfig } from "@/lib/pricing";
import { money, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

/** BRD §22 — ten steps, validated before submission. */
const STEPS = [
  "Basic information",
  "Sport & format",
  "Date & venue",
  "Registration settings",
  "Participant requirements",
  "Pricing",
  "Rules & information",
  "Images & media",
  "Preview",
  "Submit",
] as const;

type Sport = { id: string; slug: string; name: string; cover_url: string | null };
type Format = {
  id: string;
  sport_id: string;
  slug: string;
  name: string;
  registration_model: "individual" | "team";
  default_team_size: number | null;
  default_substitutes: number;
};

export type BuilderProps = {
  sports: Sport[];
  formats: Format[];
  fee: FeeConfig;
  /** Existing event when editing a draft. */
  initial?: Partial<EventDraftInput> & { id?: string; status?: string; review_note?: string | null };
};

const SKILLS = ["Beginner", "Intermediate", "Advanced"];
const INCLUDED_SUGGESTIONS = [
  "Court hire", "Pitch hire", "Balls", "Bibs", "Referee", "Umpires",
  "Water", "Medals", "Prizes", "Photography",
];

export function EventBuilder({ sports, formats, fee, initial }: BuilderProps) {
  const router = useRouter();
  const toast = useToast();

  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [eventId, setEventId] = useState(initial?.id);

  const [f, setF] = useState<EventDraftInput>({
    id: initial?.id,
    name: initial?.name ?? "",
    sport_id: initial?.sport_id ?? "",
    format_id: initial?.format_id ?? "",
    description: initial?.description ?? "",
    venue_name: initial?.venue_name ?? "",
    venue_address: initial?.venue_address ?? "",
    starts_at: initial?.starts_at ?? "",
    ends_at: initial?.ends_at ?? "",
    registration_opens_at: initial?.registration_opens_at ?? "",
    registration_closes_at: initial?.registration_closes_at ?? "",
    registration_model: initial?.registration_model ?? "team",
    price_amount: initial?.price_amount ?? 0,
    price_unit: initial?.price_unit ?? "per_team",
    tax_percent: initial?.tax_percent ?? 0,
    rules: initial?.rules ?? "",
    eligibility: initial?.eligibility ?? "",
    participant_requirements: initial?.participant_requirements ?? "",
    cancellation_policy: initial?.cancellation_policy ?? "",
    whats_included: initial?.whats_included ?? [],
    contact_email: initial?.contact_email ?? "",
    contact_phone: initial?.contact_phone ?? "",
    banner_url: initial?.banner_url ?? "",
    config: {
      max_participants: initial?.config?.max_participants ?? null,
      min_participants: initial?.config?.min_participants ?? 0,
      waitlist_capacity: initial?.config?.waitlist_capacity ?? 0,
      min_age: initial?.config?.min_age ?? null,
      max_age: initial?.config?.max_age ?? null,
      gender_requirement: initial?.config?.gender_requirement ?? "any",
      skill_levels: initial?.config?.skill_levels ?? [],
      team_size: initial?.config?.team_size ?? null,
      max_teams: initial?.config?.max_teams ?? null,
      substitutes_per_team: initial?.config?.substitutes_per_team ?? 0,
      allow_individual_join: initial?.config?.allow_individual_join ?? false,
    },
  });

  const set = <K extends keyof EventDraftInput>(k: K, v: EventDraftInput[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));
  const setCfg = (patch: Partial<EventDraftInput["config"]>) =>
    setF((prev) => ({ ...prev, config: { ...prev.config, ...patch } }));

  const sport = sports.find((s) => s.id === f.sport_id);
  const format = formats.find((x) => x.id === f.format_id);
  const sportFormats = formats.filter((x) => x.sport_id === f.sport_id);
  const isTeam = f.registration_model === "team";

  const problems = useMemo(
    () =>
      validateForSubmission({
        ...f,
        config: {
          max_participants: f.config.max_participants ?? null,
          max_teams: f.config.max_teams ?? null,
        },
      }),
    [f]
  );

  const price = useMemo(
    () =>
      computePrice({
        baseAmount: Number(f.price_amount) || 0,
        taxPercent: Number(f.tax_percent) || 0,
        fee,
      }),
    [f.price_amount, f.tax_percent, fee]
  );

  async function save(showToast = true) {
    setBusy(true);
    const res = await saveEventDraft({ ...f, id: eventId });
    setBusy(false);
    if (!res.ok) {
      toast(res.error, "danger");
      return false;
    }
    setEventId(res.data.id);
    setF((prev) => ({ ...prev, id: res.data.id }));
    if (showToast) toast("Draft saved", "success");
    return true;
  }

  async function submit() {
    if (!(await save(false))) return;
    setBusy(true);
    const res = await submitForApproval(eventId ?? f.id!);
    setBusy(false);
    if (!res.ok) {
      toast(res.error, "danger");
      return;
    }
    toast("Submitted for approval", "success");
    router.push("/organizer/events");
  }

  return (
    <div className="lg:flex">
      {/* ---------------- stepper rail ---------------- */}
      <aside className="shrink-0 border-b border-line px-5 py-4 lg:w-[220px] lg:border-b-0 lg:border-r">
        <ol className="no-scrollbar flex gap-1.5 overflow-x-auto lg:flex-col lg:gap-0.5">
          {STEPS.map((label, i) => {
            const done = i < step;
            const now = i === step;
            const stepProblems = problems.filter((p) => p.step === i + 1).length;
            return (
              <li key={label} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  aria-current={now ? "step" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[12.5px] font-semibold",
                    now ? "bg-soft text-ink" : done ? "text-ink" : "text-ink-3"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-[22px] shrink-0 place-items-center rounded-full text-[11px] font-extrabold",
                      now
                        ? "bg-volt text-ink"
                        : done
                          ? "bg-ink text-white"
                          : "bg-soft text-ink-3"
                    )}
                  >
                    {done ? <Check size={12} aria-hidden /> : i + 1}
                  </span>
                  <span className="flex-1 whitespace-nowrap lg:whitespace-normal">{label}</span>
                  {stepProblems > 0 && (
                    <span className="size-1.5 shrink-0 rounded-full bg-warning" aria-label={`${stepProblems} issue(s)`} />
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </aside>

      {/* ---------------- step body ---------------- */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-ink-3">
              Step {step + 1} of 10
              {sport ? ` · ${sport.name}` : ""}
              {format ? ` · ${format.name}` : ""}
            </p>
            <h1 className="mt-0.5 text-[17px] font-extrabold tracking-[-0.02em]">
              {STEPS[step]}
            </h1>
          </div>
          <Button variant="ghost" size="sm" icon={<Save size={14} />} loading={busy} onClick={() => save()}>
            Save draft
          </Button>
          {step < 9 ? (
            <Button size="sm" onClick={() => setStep((s) => Math.min(9, s + 1))}>
              Continue
            </Button>
          ) : (
            <Button
              size="sm"
              icon={<Send size={14} />}
              loading={busy}
              disabled={problems.length > 0}
              onClick={submit}
            >
              Submit for approval
            </Button>
          )}
        </div>

        <div className="px-5 py-[18px]">
          {initial?.status === "changes_requested" && initial.review_note && (
            <div className="mb-4 rounded-panel border border-warning-wash bg-warning-wash p-4">
              <p className="flex items-center gap-2 text-[13px] font-bold text-warning">
                <AlertCircle size={15} aria-hidden />
                Changes requested by the Super Admin
              </p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">
                {initial.review_note}
              </p>
            </div>
          )}

          {/* 1 — basic */}
          {step === 0 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Event name" required className="md:col-span-2">
                <Input
                  density="outline"
                  value={f.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Dubai Padel Open 2026"
                />
              </Field>
              <Field
                label="Description"
                required
                hint="What is it, who is it for, how does the day run?"
                className="md:col-span-2"
              >
                <Textarea
                  density="outline"
                  rows={6}
                  value={f.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>
              <Field label="Contact email" hint="Shown publicly on the event page.">
                <Input
                  density="outline"
                  type="email"
                  value={f.contact_email ?? ""}
                  onChange={(e) => set("contact_email", e.target.value)}
                />
              </Field>
              <Field label="Contact phone">
                <Input
                  density="outline"
                  value={f.contact_phone ?? ""}
                  onChange={(e) => set("contact_phone", e.target.value)}
                />
              </Field>
            </div>
          )}

          {/* 2 — sport & format */}
          {step === 1 && (
            <div className="grid gap-5">
              <Field label="Sport" required>
                <div className="flex flex-wrap gap-2">
                  {sports.map((s) => (
                    <Chip
                      key={s.id}
                      selected={f.sport_id === s.id}
                      onClick={() => {
                        set("sport_id", s.id);
                        set("format_id", "");
                      }}
                    >
                      {s.name}
                    </Chip>
                  ))}
                </div>
              </Field>

              <Field
                label="Format"
                required
                hint="The format decides whether people register as individuals or teams, and the default squad size."
              >
                <div className="flex flex-wrap gap-2">
                  {sportFormats.length === 0 && (
                    <p className="text-[13px] text-ink-3">Pick a sport first.</p>
                  )}
                  {sportFormats.map((x) => (
                    <Chip
                      key={x.id}
                      selected={f.format_id === x.id}
                      onClick={() => {
                        set("format_id", x.id);
                        set("registration_model", x.registration_model);
                        set("price_unit", x.registration_model === "team" ? "per_team" : "per_player");
                        setCfg({
                          team_size: x.default_team_size,
                          substitutes_per_team: x.default_substitutes,
                        });
                      }}
                    >
                      {x.name}
                    </Chip>
                  ))}
                </div>
              </Field>

              <Field label="Registration model">
                <SegmentedControl
                  ariaLabel="Registration model"
                  value={f.registration_model}
                  onChange={(v) => {
                    set("registration_model", v);
                    set("price_unit", v === "team" ? "per_team" : "per_player");
                  }}
                  options={[
                    { value: "team", label: "Team" },
                    { value: "individual", label: "Individual" },
                  ]}
                />
              </Field>
            </div>
          )}

          {/* 3 — date & venue */}
          {step === 2 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Starts" required>
                <Input
                  density="outline"
                  type="datetime-local"
                  value={toLocal(f.starts_at)}
                  onChange={(e) => set("starts_at", fromLocal(e.target.value))}
                />
              </Field>
              <Field label="Ends">
                <Input
                  density="outline"
                  type="datetime-local"
                  value={toLocal(f.ends_at ?? "")}
                  onChange={(e) => set("ends_at", fromLocal(e.target.value))}
                />
              </Field>
              <Field label="Venue name" required>
                <Input
                  density="outline"
                  value={f.venue_name ?? ""}
                  onChange={(e) => set("venue_name", e.target.value)}
                  placeholder="XYZ Padel Club"
                />
              </Field>
              <Field label="Address">
                <Input
                  density="outline"
                  value={f.venue_address ?? ""}
                  onChange={(e) => set("venue_address", e.target.value)}
                  placeholder="Al Quoz 1, Dubai"
                />
              </Field>
            </div>
          )}

          {/* 4 — registration settings */}
          {step === 3 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Registration opens" required>
                <Input
                  density="outline"
                  type="datetime-local"
                  value={toLocal(f.registration_opens_at ?? "")}
                  onChange={(e) => set("registration_opens_at", fromLocal(e.target.value))}
                />
              </Field>
              <Field
                label="Registration closes"
                required
                hint="Unpaid places are held until this moment."
              >
                <Input
                  density="outline"
                  type="datetime-local"
                  value={toLocal(f.registration_closes_at ?? "")}
                  onChange={(e) => set("registration_closes_at", fromLocal(e.target.value))}
                />
              </Field>
              <Field label={isTeam ? "Max teams" : "Max participants"} required>
                <Input
                  density="outline"
                  type="number"
                  min={1}
                  value={(isTeam ? f.config.max_teams : f.config.max_participants) ?? ""}
                  onChange={(e) =>
                    setCfg(
                      isTeam
                        ? { max_teams: Number(e.target.value) || null }
                        : { max_participants: Number(e.target.value) || null }
                    )
                  }
                />
              </Field>
              <Field label={isTeam ? "Min teams to run" : "Min participants"}>
                <Input
                  density="outline"
                  type="number"
                  min={0}
                  value={f.config.min_participants ?? 0}
                  onChange={(e) => setCfg({ min_participants: Number(e.target.value) || 0 })}
                />
              </Field>
              <Field label="Waitlist capacity" hint="0 disables the waitlist.">
                <Input
                  density="outline"
                  type="number"
                  min={0}
                  value={f.config.waitlist_capacity ?? 0}
                  onChange={(e) => setCfg({ waitlist_capacity: Number(e.target.value) || 0 })}
                />
              </Field>
              {isTeam && (
                <>
                  <Field label="Team size">
                    <Input
                      density="outline"
                      type="number"
                      min={1}
                      value={f.config.team_size ?? ""}
                      onChange={(e) => setCfg({ team_size: Number(e.target.value) || null })}
                    />
                  </Field>
                  <Field label="Substitutes per team">
                    <Input
                      density="outline"
                      type="number"
                      min={0}
                      value={f.config.substitutes_per_team ?? 0}
                      onChange={(e) =>
                        setCfg({ substitutes_per_team: Number(e.target.value) || 0 })
                      }
                    />
                  </Field>
                  <Field label="Allow individuals to join" className="md:col-span-2">
                    <SegmentedControl
                      ariaLabel="Allow individual join"
                      value={f.config.allow_individual_join ? "on" : "off"}
                      onChange={(v) => setCfg({ allow_individual_join: v === "on" })}
                      options={[
                        { value: "off", label: "Off" },
                        { value: "on", label: "On" },
                      ]}
                    />
                  </Field>
                </>
              )}
            </div>
          )}

          {/* 5 — participant requirements */}
          {step === 4 && (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Minimum age">
                <Input
                  density="outline"
                  type="number"
                  min={0}
                  value={f.config.min_age ?? ""}
                  onChange={(e) => setCfg({ min_age: Number(e.target.value) || null })}
                />
              </Field>
              <Field label="Maximum age">
                <Input
                  density="outline"
                  type="number"
                  min={0}
                  value={f.config.max_age ?? ""}
                  onChange={(e) => setCfg({ max_age: Number(e.target.value) || null })}
                />
              </Field>
              <Field label="Gender">
                <Select
                  density="outline"
                  value={f.config.gender_requirement}
                  onChange={(e) =>
                    setCfg({
                      gender_requirement: e.target
                        .value as EventDraftInput["config"]["gender_requirement"],
                    })
                  }
                >
                  <option value="any">Open to all</option>
                  <option value="male">Men only</option>
                  <option value="female">Women only</option>
                  <option value="mixed">Mixed teams required</option>
                </Select>
              </Field>
              <Field label="Skill levels" className="md:col-span-2">
                <div className="flex flex-wrap gap-2">
                  {SKILLS.map((s) => {
                    const on = (f.config.skill_levels ?? []).includes(s);
                    return (
                      <Chip
                        key={s}
                        selected={on}
                        onClick={() =>
                          setCfg({
                            skill_levels: on
                              ? (f.config.skill_levels ?? []).filter((x) => x !== s)
                              : [...(f.config.skill_levels ?? []), s],
                          })
                        }
                      >
                        {s}
                      </Chip>
                    );
                  })}
                </div>
              </Field>
              <Field label="What to bring" className="md:col-span-2">
                <Textarea
                  density="outline"
                  rows={3}
                  value={f.participant_requirements ?? ""}
                  onChange={(e) => set("participant_requirements", e.target.value)}
                  placeholder="Bring your own rackets. Court shoes required."
                />
              </Field>
            </div>
          )}

          {/* 6 — pricing */}
          {step === 5 && (
            <div className="grid gap-5 lg:grid-cols-2">
              <div className="grid gap-4">
                <Field label={isTeam ? "Entry fee per team" : "Entry fee per player"} required>
                  <Input
                    density="outline"
                    type="number"
                    min={0}
                    step="0.01"
                    value={f.price_amount}
                    onChange={(e) => set("price_amount", Number(e.target.value) || 0)}
                  />
                </Field>
                <Field label="Charged">
                  <SegmentedControl
                    ariaLabel="Price unit"
                    value={f.price_unit}
                    onChange={(v) => set("price_unit", v)}
                    options={[
                      { value: "per_team", label: "Per team" },
                      { value: "per_player", label: "Per player" },
                    ]}
                  />
                </Field>
                <Field label="VAT %" hint="Leave at 0 unless VAT applies.">
                  <Input
                    density="outline"
                    type="number"
                    min={0}
                    max={100}
                    step="0.01"
                    value={f.tax_percent}
                    onChange={(e) => set("tax_percent", Number(e.target.value) || 0)}
                  />
                </Field>
              </div>

              <Panel title="What the participant pays" className="self-start">
                <div className="px-4 pb-4">
                  <Line label="Entry fee" value={money(price.subtotal)} />
                  <Line
                    label={
                      fee.mode === "percentage"
                        ? `Platform fee (${fee.percentage}%)`
                        : "Platform fee"
                    }
                    value={money(price.platformFee)}
                  />
                  {price.tax > 0 && <Line label={`VAT (${f.tax_percent}%)`} value={money(price.tax)} />}
                  <Divider className="my-2.5" />
                  <Line label="Total" value={money(price.total)} bold />
                  <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
                    Sportsconnect collects and reconciles all payments, including cash taken
                    at the venue. Your dashboard shows expected collection.
                  </p>
                </div>
              </Panel>
            </div>
          )}

          {/* 7 — rules & information */}
          {step === 6 && (
            <div className="grid gap-4">
              <Field label="Rules">
                <Textarea
                  density="outline"
                  rows={4}
                  value={f.rules ?? ""}
                  onChange={(e) => set("rules", e.target.value)}
                />
              </Field>
              <Field label="Eligibility">
                <Textarea
                  density="outline"
                  rows={3}
                  value={f.eligibility ?? ""}
                  onChange={(e) => set("eligibility", e.target.value)}
                />
              </Field>
              <Field
                label="Cancellation & refund policy"
                required
                hint="Consumers must see this before they pay."
              >
                <Textarea
                  density="outline"
                  rows={4}
                  value={f.cancellation_policy ?? ""}
                  onChange={(e) => set("cancellation_policy", e.target.value)}
                  placeholder="Full refund if cancelled 48 hours before the start. 50% within 48 hours. No refund after the event starts."
                />
              </Field>
              <Field label="What's included">
                <div className="flex flex-wrap gap-2">
                  {[...new Set([...INCLUDED_SUGGESTIONS, ...(f.whats_included ?? [])])].map(
                    (item) => {
                      const on = (f.whats_included ?? []).includes(item);
                      return (
                        <Chip
                          key={item}
                          selected={on}
                          onClick={() =>
                            set(
                              "whats_included",
                              on
                                ? (f.whats_included ?? []).filter((x) => x !== item)
                                : [...(f.whats_included ?? []), item]
                            )
                          }
                        >
                          {item}
                        </Chip>
                      );
                    }
                  )}
                </div>
              </Field>
            </div>
          )}

          {/* 8 — images */}
          {step === 7 && (
            <div className="grid gap-4">
              <Field
                label="Banner image URL"
                required
                hint="Direct image upload is coming shortly. For now paste a URL, or use the sport's default artwork."
              >
                <Input
                  density="outline"
                  value={f.banner_url ?? ""}
                  onChange={(e) => set("banner_url", e.target.value)}
                  placeholder="https://…"
                />
              </Field>
              {sport && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() => set("banner_url", sport.cover_url ?? "")}
                >
                  Use {sport.name} artwork
                </Button>
              )}
              <div className="max-w-[420px]">
                <p className="mb-2 text-[12px] font-bold text-ink-2">Preview</p>
                <Cover
                  src={f.banner_url || sport?.cover_url || null}
                  alt=""
                  scrim="bottom"
                  sizes="420px"
                  fallbackLabel={sport?.name?.[0]}
                  className="aspect-[16/9] w-full"
                >
                  <div className="absolute inset-x-4 bottom-3 text-white">
                    <p className="text-[16px] font-extrabold">{f.name || "Event name"}</p>
                  </div>
                </Cover>
              </div>
            </div>
          )}

          {/* 9 — preview */}
          {step === 8 && (
            <div className="max-w-[560px]">
              <p className="mb-3 text-[13px] text-ink-2">
                This is what a consumer sees on the public event page.
              </p>
              <div className="overflow-hidden rounded-card border border-line">
                <Cover
                  src={f.banner_url || sport?.cover_url || null}
                  alt=""
                  scrim="bottom"
                  sizes="560px"
                  rounded="rounded-none"
                  fallbackLabel={sport?.name?.[0]}
                  className="h-[180px] w-full"
                >
                  <div className="absolute inset-x-4 bottom-3.5 text-white">
                    <div className="flex gap-1.5">
                      {sport && <Tag tone="volt">{sport.name}</Tag>}
                      {format && (
                        <Tag tone="outline" className="border-white/40 text-white">
                          {format.name}
                        </Tag>
                      )}
                    </div>
                    <p className="mt-2 text-[20px] font-extrabold">{f.name || "Untitled event"}</p>
                  </div>
                </Cover>
                <div className="p-4">
                  <Line label="When" value={f.starts_at ? formatDateTime(f.starts_at) : "—"} />
                  <Line label="Venue" value={f.venue_name || "—"} />
                  <Line
                    label={isTeam ? "Teams" : "Places"}
                    value={String((isTeam ? f.config.max_teams : f.config.max_participants) ?? "—")}
                  />
                  <Line label="Entry" value={money(Number(f.price_amount) || 0)} />
                  <Line label="Total to pay" value={money(price.total)} bold />
                  {f.description && (
                    <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-ink-2">
                      {f.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 10 — submit */}
          {step === 9 && (
            <div className="max-w-[560px]">
              <Panel title={problems.length === 0 ? "Ready to submit" : "Not ready yet"}>
                <div className="px-4 pb-4">
                  {problems.length === 0 ? (
                    <p className="text-[13.5px] text-ink-2">
                      Everything required is filled in. Submitting sends this to a Super Admin
                      for review — it stays private until they approve it.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {problems.map((p, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-[13px]">
                          <span className="mt-0.5 text-warning">
                            <AlertCircle size={14} aria-hidden />
                          </span>
                          <span>
                            <button
                              type="button"
                              onClick={() => setStep(p.step - 1)}
                              className="font-bold text-volt-deep underline underline-offset-2"
                            >
                              Step {p.step} · {p.label}
                            </button>
                            <span className="text-ink-2"> — {p.message}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <Button
                    className="mt-4"
                    block
                    icon={<Send size={15} />}
                    loading={busy}
                    disabled={problems.length > 0}
                    onClick={submit}
                  >
                    Submit for approval
                  </Button>
                </div>
              </Panel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between py-1 text-[13px]">
      <span className="text-ink-2">{label}</span>
      <span className={cn("tabular-nums", bold ? "font-extrabold" : "font-semibold")}>
        {value}
      </span>
    </div>
  );
}

/** <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" with no zone. */
function toLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocal(value: string): string {
  return value ? new Date(value).toISOString() : "";
}
