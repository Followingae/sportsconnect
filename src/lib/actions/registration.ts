"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { computePrice, generateReference, round2 } from "@/lib/pricing";
import { resolveFee, getAccountPerks, getEnabledPaymentMethods } from "@/lib/queries/settings";
import { getEventCapacity } from "@/lib/queries/events";
import { gateFor } from "@/lib/event-state";
import type { Enums } from "@/lib/database.types";

export type RegisterResult =
  | { ok: true; registrationId: string; reference: string; waitlisted: boolean }
  | { ok: false; error: string };

const answerSchema = z.record(z.string(), z.unknown());

const registerSchema = z.object({
  eventId: z.string().uuid(),
  teamName: z.string().trim().max(60).optional(),
  /** Additional squad members the captain invites by name/contact. */
  teammates: z
    .array(
      z.object({
        name: z.string().trim().min(2),
        email: z.string().trim().email().optional().or(z.literal("")),
        phone: z.string().trim().optional(),
        role: z.enum(["player", "substitute"]).default("player"),
      })
    )
    .max(24)
    .optional(),
  answers: answerSchema.optional(),
  method: z.enum(["bank_transfer", "cash_at_venue"]),
  acceptTerms: z.literal(true),
  joinWaitlist: z.boolean().optional(),
});

export type RegisterInput = z.input<typeof registerSchema>;

/**
 * Creates the registration, its team (for team formats), answers and the
 * pending payment in one go.
 *
 * Money rules that this enforces (docs/DECISIONS.md):
 *  - D3: only bank transfer and cash at venue are selectable.
 *  - D4: the payment is created `pending`. Nothing here can mark it paid —
 *    that is a Super Admin action.
 *  - D5: no expiry is written. A pending place holds until registration closes.
 */
export async function registerForEvent(input: RegisterInput): Promise<RegisterResult> {
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in to register." };

  // --- re-read the event server-side; never trust a price from the client ---
  const { data: event } = await supabase
    .from("events")
    .select(
      `id, slug, name, status, registration_model, price_amount, price_unit, currency,
       tax_percent, sport_id, registration_opens_at, registration_closes_at, starts_at,
       cancellation_reason,
       config:event_config ( max_participants, max_teams, waitlist_capacity ),
       sport:sports ( slug )`
    )
    .eq("id", data.eventId)
    .single();

  if (!event) return { ok: false, error: "That event no longer exists." };

  const enabled = await getEnabledPaymentMethods();
  if (!enabled.includes(data.method)) {
    return { ok: false, error: "That payment method isn't available." };
  }

  // --- gate: is registration actually possible right now? -------------------
  const counts = await getEventCapacity(event.id);
  const { data: existing } = await supabase
    .from("registrations")
    .select("id, status")
    .eq("event_id", event.id)
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .maybeSingle();

  const gate = gateFor(
    event,
    {
      taken: counts.taken,
      waitlisted: counts.waitlisted,
      maxParticipants: event.config?.max_participants ?? null,
      maxTeams: event.config?.max_teams ?? null,
      waitlistCapacity: event.config?.waitlist_capacity ?? 0,
    },
    existing
  );

  if (gate.kind === "already_registered") {
    return { ok: false, error: "You already have a place in this event." };
  }
  if (gate.kind !== "open" && gate.kind !== "waitlist") {
    return { ok: false, error: "Registration isn't open for this event." };
  }
  const waitlisted = gate.kind === "waitlist";

  // --- price it, server-side ------------------------------------------------
  const [fee, perks] = await Promise.all([
    resolveFee(event.id, event.sport_id),
    getAccountPerks(user.id),
  ]);

  const breakdown = computePrice({
    baseAmount: Number(event.price_amount),
    quantity: 1, // per-team entry, or one player's place
    discountPercent: perks.discountPercent,
    creditAmount: perks.creditTotal,
    taxPercent: Number(event.tax_percent),
    fee,
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", user.id)
    .single();

  // --- team ------------------------------------------------------------------
  let teamId: string | null = null;
  if (event.registration_model === "team") {
    const name = data.teamName?.trim();
    if (!name) return { ok: false, error: "Give your team a name." };

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({ event_id: event.id, name, created_by: user.id })
      .select("id")
      .single();

    if (teamError) {
      return {
        ok: false,
        error:
          teamError.code === "23505"
            ? "A team with that name is already registered. Pick another."
            : "Couldn't create your team. Try again.",
      };
    }
    teamId = team.id;
  }

  // --- registration ----------------------------------------------------------
  const { data: registration, error: regError } = await supabase
    .from("registrations")
    .insert({
      event_id: event.id,
      user_id: user.id,
      team_id: teamId,
      participant_name: profile?.full_name || (user.email ?? "Participant"),
      participant_email: profile?.email ?? user.email ?? null,
      participant_phone: profile?.phone ?? null,
      role: event.registration_model === "team" ? "captain" : "player",
      is_captain: event.registration_model === "team",
      status: waitlisted ? "waitlisted" : "pending",
      source: "online",
      waitlist_position: waitlisted ? counts.waitlisted + 1 : null,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (regError || !registration) {
    if (teamId) await supabase.from("teams").delete().eq("id", teamId);
    return {
      ok: false,
      error:
        regError?.code === "23505"
          ? "You already have a place in this event."
          : "Couldn't complete your registration. Try again.",
    };
  }

  // --- teammates (named squad members, no accounts of their own) -------------
  if (teamId && data.teammates?.length) {
    await supabase.from("registrations").insert(
      data.teammates.map((m) => ({
        event_id: event.id,
        team_id: teamId,
        participant_name: m.name,
        participant_email: m.email || null,
        participant_phone: m.phone || null,
        role: m.role,
        // Squad members inherit the captain's state; they don't pay separately.
        status: (waitlisted ? "waitlisted" : "pending") as Enums<"registration_status">,
        source: "online" as const,
        created_by: user.id,
      }))
    );
  }

  // --- custom question answers -----------------------------------------------
  if (data.answers && Object.keys(data.answers).length > 0) {
    const rows = Object.entries(data.answers).map(([question_id, value]) => ({
      registration_id: registration.id,
      question_id,
      value: value as never,
    }));
    await supabase.from("registration_answers").insert(rows);
  }

  // --- payment ----------------------------------------------------------------
  const reference = generateReference(event.sport?.slug);

  const { error: payError } = await supabase.from("payments").insert({
    registration_id: registration.id,
    event_id: event.id,
    reference_code: reference,
    subtotal_amount: breakdown.subtotal,
    discount_amount: round2(breakdown.discount + breakdown.creditApplied),
    platform_fee_amount: breakdown.platformFee,
    tax_amount: breakdown.tax,
    total_amount: breakdown.total,
    currency: event.currency,
    method: data.method,
    status: "pending", // D4 — only a Super Admin can move this to paid
  });

  if (payError) {
    await supabase.from("registrations").delete().eq("id", registration.id);
    if (teamId) await supabase.from("teams").delete().eq("id", teamId);
    return { ok: false, error: "Couldn't set up your payment. Try again." };
  }

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_role: "consumer",
    action: waitlisted ? "registration.waitlisted" : "registration.created",
    entity_type: "registration",
    entity_id: registration.id,
    summary: `${profile?.full_name ?? "A consumer"} registered for ${event.name} (${reference})`,
  });

  revalidatePath(`/e/${event.slug}`);
  revalidatePath("/my-events");

  return { ok: true, registrationId: registration.id, reference, waitlisted };
}

/**
 * The consumer says they've sent the transfer, optionally with proof. This moves
 * the payment to `processing` — "reported, awaiting verification". It never
 * moves it to `paid` (D4).
 */
export async function reportTransferSent(
  registrationId: string,
  payerReference?: string,
  proofUrl?: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in first." };

  const { data: reg } = await supabase
    .from("registrations")
    .select("id, user_id, event_id")
    .eq("id", registrationId)
    .single();

  if (!reg || reg.user_id !== user.id) {
    return { ok: false, error: "That registration isn't yours." };
  }

  const { error } = await supabase
    .from("payments")
    .update({
      status: "processing",
      payer_reference: payerReference?.trim() || null,
      proof_url: proofUrl ?? null,
    })
    .eq("registration_id", registrationId)
    .eq("status", "pending");

  if (error) return { ok: false, error: "Couldn't record that. Try again." };

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_role: "consumer",
    action: "payment.transfer_reported",
    entity_type: "registration",
    entity_id: registrationId,
    summary: "Consumer reported a bank transfer as sent",
  });

  revalidatePath("/my-events");
  revalidatePath("/payments");
  return { ok: true };
}

/** Consumer-initiated cancellation → a refund request for the Super Admin (BRD §18). */
export async function cancelRegistration(
  registrationId: string,
  reason: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Sign in first." };

  const { data: reg } = await supabase
    .from("registrations")
    .select("id, user_id, team_id, event_id, status")
    .eq("id", registrationId)
    .single();

  if (!reg || reg.user_id !== user.id) {
    return { ok: false, error: "That registration isn't yours." };
  }
  if (reg.status === "cancelled") return { ok: false, error: "Already cancelled." };

  await supabase
    .from("registrations")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason,
      cancelled_by: user.id,
    })
    .eq("id", registrationId);

  // Squad members go with the captain.
  if (reg.team_id) {
    await supabase
      .from("registrations")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("team_id", reg.team_id)
      .neq("id", registrationId);
  }

  // If money was taken, open a refund request. The Super Admin decides the
  // amount against the event's policy — we never presume it here.
  const { data: payment } = await supabase
    .from("payments")
    .select("id, status, total_amount, currency")
    .eq("registration_id", registrationId)
    .maybeSingle();

  if (payment && ["paid", "processing"].includes(payment.status)) {
    await supabase.from("refunds").insert({
      payment_id: payment.id,
      registration_id: registrationId,
      amount: payment.total_amount,
      currency: payment.currency,
      type: "full",
      status: "requested",
      reason,
      initiated_by: user.id,
      initiated_by_role: "consumer",
    });
  } else if (payment) {
    await supabase
      .from("payments")
      .update({ status: "cancelled" })
      .eq("id", payment.id);
  }

  await supabase.from("audit_log").insert({
    actor_id: user.id,
    actor_role: "consumer",
    action: "registration.cancelled",
    entity_type: "registration",
    entity_id: registrationId,
    summary: `Consumer cancelled: ${reason}`,
  });

  revalidatePath("/my-events");
  return { ok: true };
}
