"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getOrganizerContext } from "@/lib/queries/organizer";
import { generateReference, computePrice } from "@/lib/pricing";
import { resolveFee } from "@/lib/queries/settings";
import { slugify } from "@/lib/format";
import { canTransition } from "@/lib/status";
import { validateForSubmission } from "@/lib/event-validation";
import { notifyUsers } from "@/lib/actions/notifications";
import type { Enums, TablesUpdate } from "@/lib/database.types";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

const fail = (error: string) => ({ ok: false as const, error });

async function requirePermission(permission: string) {
  const ctx = await getOrganizerContext();
  if (!ctx) return { ctx: null, error: "Sign in first." };
  if (!ctx.can(permission)) {
    return { ctx: null, error: "Your account doesn't have permission to do that." };
  }
  return { ctx, error: null };
}

async function audit(
  action: string,
  entityType: string,
  entityId: string,
  summary: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };

  await supabase.from("audit_log").insert({
    actor_id: user?.id ?? null,
    actor_role: profile?.role ?? null,
    action,
    entity_type: entityType,
    entity_id: entityId,
    summary,
  });
}

/* ======================================================== event builder === */

const eventDraftSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(3, "Give the event a name."),
  sport_id: z.string().uuid("Pick a sport."),
  format_id: z.string().uuid("Pick a format.").optional().nullable(),
  description: z.string().trim().default(""),
  venue_name: z.string().trim().optional().nullable(),
  venue_address: z.string().trim().optional().nullable(),
  starts_at: z.string().min(1, "Set a start date and time."),
  ends_at: z.string().optional().nullable(),
  registration_opens_at: z.string().optional().nullable(),
  registration_closes_at: z.string().optional().nullable(),
  registration_model: z.enum(["individual", "team"]),
  price_amount: z.coerce.number().min(0),
  price_unit: z.enum(["per_player", "per_team"]),
  tax_percent: z.coerce.number().min(0).max(100).default(0),
  rules: z.string().optional().nullable(),
  eligibility: z.string().optional().nullable(),
  participant_requirements: z.string().optional().nullable(),
  cancellation_policy: z.string().optional().nullable(),
  whats_included: z.array(z.string()).default([]),
  contact_email: z.string().email().optional().or(z.literal("")).nullable(),
  contact_phone: z.string().optional().nullable(),
  banner_url: z.string().optional().nullable(),
  config: z.object({
    max_participants: z.coerce.number().int().min(0).optional().nullable(),
    min_participants: z.coerce.number().int().min(0).default(0),
    waitlist_capacity: z.coerce.number().int().min(0).default(0),
    min_age: z.coerce.number().int().min(0).optional().nullable(),
    max_age: z.coerce.number().int().min(0).optional().nullable(),
    gender_requirement: z.enum(["any", "male", "female", "mixed"]).default("any"),
    skill_levels: z.array(z.string()).default([]),
    team_size: z.coerce.number().int().min(1).optional().nullable(),
    max_teams: z.coerce.number().int().min(0).optional().nullable(),
    substitutes_per_team: z.coerce.number().int().min(0).default(0),
    allow_individual_join: z.boolean().default(false),
  }),
});

export type EventDraftInput = z.input<typeof eventDraftSchema>;

/** Create or update a draft. Never changes status — that's submitForApproval. */
export async function saveEventDraft(
  input: EventDraftInput
): Promise<ActionResult<{ id: string }>> {
  const { ctx, error } = await requirePermission(
    (input as { id?: string }).id ? "edit_event" : "create_event"
  );
  if (!ctx) return fail(error!);

  const parsed = eventDraftSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;

  const supabase = await createClient();
  const { config, id, ...eventFields } = d;

  const payload = {
    ...eventFields,
    contact_email: eventFields.contact_email || null,
    organizer_id: ctx.user.id,
    organization_id: ctx.organization?.id ?? null,
    ends_at: eventFields.ends_at || null,
    registration_opens_at: eventFields.registration_opens_at || null,
    registration_closes_at: eventFields.registration_closes_at || null,
  };

  let eventId = id;

  if (eventId) {
    const { data: current } = await supabase
      .from("events")
      .select("status")
      .eq("id", eventId)
      .single();

    // Once live, content edits are fine but the builder must not silently
    // rewrite a published event's core terms without a Super Admin seeing it.
    if (current && !["draft", "changes_requested", "rejected"].includes(current.status)) {
      return fail(
        "This event is past the draft stage. Ask a Super Admin to unpublish it before making changes."
      );
    }

    const { error: upErr } = await supabase.from("events").update(payload).eq("id", eventId);
    if (upErr) return fail(upErr.message);
  } else {
    const { data, error: insErr } = await supabase
      .from("events")
      .insert({ ...payload, slug: slugify(d.name), status: "draft", created_by: ctx.user.id })
      .select("id")
      .single();
    if (insErr || !data) return fail(insErr?.message ?? "Couldn't create the event.");
    eventId = data.id;
  }

  const { error: cfgErr } = await supabase
    .from("event_config")
    .upsert({ event_id: eventId, ...config }, { onConflict: "event_id" });
  if (cfgErr) return fail(cfgErr.message);

  await audit("event.saved", "event", eventId!, `Saved draft: ${d.name}`);
  revalidatePath("/organizer");
  revalidatePath(`/organizer/events/${eventId}`);

  return { ok: true, data: { id: eventId! } };
}

export async function submitForApproval(eventId: string): Promise<ActionResult> {
  const { ctx, error } = await requirePermission("submit_event");
  if (!ctx) return fail(error!);

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("*, config:event_config ( * )")
    .eq("id", eventId)
    .single();

  if (!event) return fail("Event not found.");
  if (!canTransition(event.status, "submitted")) {
    return fail(`A ${event.status.replace("_", " ")} event can't be submitted.`);
  }

  const problems = validateForSubmission(event);
  if (problems.length > 0) {
    return fail(
      `${problems.length} thing(s) still missing — starting with: ${problems[0].message}`
    );
  }

  await supabase
    .from("events")
    .update({ status: "submitted", submitted_at: new Date().toISOString(), review_note: null })
    .eq("id", eventId);

  // Tell the Super Admins there's something in the queue.
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "super_admin");

  await notifyUsers((admins ?? []).map((a) => a.id), {
    type: "event.submitted",
    title: "Event submitted for approval",
    body: `${event.name} is waiting for review.`,
    link: `/admin/approvals/${eventId}`,
  });

  await audit("event.submitted", "event", eventId, `Submitted ${event.name} for approval`);
  revalidatePath("/organizer");
  revalidatePath(`/organizer/events/${eventId}`);
  return { ok: true };
}

export async function cancelEvent(
  eventId: string,
  reason: string
): Promise<ActionResult> {
  const { ctx, error } = await requirePermission("edit_event");
  if (!ctx) return fail(error!);
  if (!reason.trim()) return fail("Give a reason — participants will see it.");

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("name, status")
    .eq("id", eventId)
    .single();
  if (!event) return fail("Event not found.");
  if (!canTransition(event.status, "cancelled")) {
    return fail("This event can't be cancelled from its current state.");
  }

  await supabase
    .from("events")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancellation_reason: reason.trim(),
    })
    .eq("id", eventId);

  // Everyone holding a place needs to know, and anyone who paid needs a refund
  // request opened for the Super Admin (D4 — only they can settle money).
  const { data: regs } = await supabase
    .from("registrations")
    .select("id, user_id, payment:payments ( id, status, total_amount, currency )")
    .eq("event_id", eventId)
    .neq("status", "cancelled");

  for (const r of regs ?? []) {
    const p = r.payment;
    if (p && ["paid", "processing"].includes(p.status)) {
      await supabase.from("refunds").insert({
        payment_id: p.id,
        registration_id: r.id,
        amount: p.total_amount,
        currency: p.currency,
        type: "full",
        status: "requested",
        reason: `Event cancelled: ${reason.trim()}`,
        initiated_by: ctx.user.id,
        initiated_by_role: "event_admin",
      });
    }
  }

  await notifyUsers(
    (regs ?? []).map((r) => r.user_id).filter((id): id is string => Boolean(id)),
    {
      type: "event.cancelled",
      title: `${event.name} was cancelled`,
      body: reason.trim(),
      link: "/my-events",
    }
  );

  await audit("event.cancelled", "event", eventId, `Cancelled: ${reason.trim()}`);
  revalidatePath("/organizer");
  return { ok: true };
}

/* ==================================================== participants (§10) === */

const participantSchema = z.object({
  event_id: z.string().uuid(),
  participant_name: z.string().trim().min(2, "Enter the participant's name."),
  participant_email: z.string().email().optional().or(z.literal("")),
  participant_phone: z.string().trim().optional(),
  team_id: z.string().uuid().optional().or(z.literal("")),
  role: z.enum(["player", "captain", "substitute"]).default("player"),
  status: z.enum(["pending", "confirmed", "waitlisted"]).default("confirmed"),
  payment: z.enum(["paid_offline", "pending", "comp"]).default("pending"),
  notes: z.string().trim().optional(),
});

export type AddParticipantInput = z.input<typeof participantSchema>;

/**
 * BRD §9 method 2 — the walk-in / offline / comp / VIP path.
 *
 * D4: an Event Admin recording cash sets `processing`, not `paid`. Only a
 * Super Admin confirms money as received. Comp entries are the exception —
 * nothing is owed, so they settle immediately at zero.
 */
export async function addParticipant(
  input: AddParticipantInput
): Promise<ActionResult<{ id: string }>> {
  const { ctx, error } = await requirePermission("add_remove_participants");
  if (!ctx) return fail(error!);

  const parsed = participantSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, name, price_amount, currency, sport_id, tax_percent, sport:sports ( slug )")
    .eq("id", d.event_id)
    .single();
  if (!event) return fail("Event not found.");

  const { data: reg, error: regErr } = await supabase
    .from("registrations")
    .insert({
      event_id: d.event_id,
      team_id: d.team_id || null,
      participant_name: d.participant_name,
      participant_email: d.participant_email || null,
      participant_phone: d.participant_phone || null,
      role: d.role,
      is_captain: d.role === "captain",
      status: d.status,
      source: "admin",
      notes: d.notes || null,
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (regErr || !reg) return fail(regErr?.message ?? "Couldn't add that participant.");

  const isComp = d.payment === "comp";
  const fee = await resolveFee(event.id, event.sport_id);
  const price = computePrice({
    baseAmount: isComp ? 0 : Number(event.price_amount),
    taxPercent: Number(event.tax_percent),
    fee: isComp ? { mode: "none", fixed_amount: 0, percentage: 0 } : fee,
  });

  await supabase.from("payments").insert({
    registration_id: reg.id,
    event_id: d.event_id,
    reference_code: generateReference(event.sport?.slug),
    subtotal_amount: price.subtotal,
    platform_fee_amount: price.platformFee,
    tax_amount: price.tax,
    total_amount: price.total,
    currency: event.currency,
    method: isComp ? "comp" : "cash_at_venue",
    status: isComp ? "paid" : d.payment === "paid_offline" ? "processing" : "pending",
    admin_note:
      d.payment === "paid_offline"
        ? "Cash collected by the organizer — awaiting Super Admin reconciliation"
        : null,
  });

  await audit(
    "participant.added",
    "registration",
    reg.id,
    `Added ${d.participant_name} to ${event.name} (${d.payment})`
  );
  revalidatePath(`/organizer/events/${d.event_id}/participants`);
  return { ok: true, data: { id: reg.id } };
}

export async function updateParticipant(
  registrationId: string,
  patch: {
    status?: Enums<"registration_status">;
    team_id?: string | null;
    role?: Enums<"participant_role">;
    notes?: string;
  }
): Promise<ActionResult> {
  const { ctx, error } = await requirePermission("manage_participants");
  if (!ctx) return fail(error!);

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("registrations")
    .select("event_id, participant_name, status")
    .eq("id", registrationId)
    .single();
  if (!before) return fail("Registration not found.");

  const update: TablesUpdate<"registrations"> = { ...patch };
  if (patch.status === "cancelled") update.cancelled_at = new Date().toISOString();
  if (patch.status === "confirmed") update.confirmed_at = new Date().toISOString();
  if (patch.role) update.is_captain = patch.role === "captain";

  const { error: upErr } = await supabase
    .from("registrations")
    .update(update)
    .eq("id", registrationId);
  if (upErr) return fail(upErr.message);

  await audit(
    "participant.updated",
    "registration",
    registrationId,
    `${before.participant_name}: ${JSON.stringify(patch)}`
  );
  revalidatePath(`/organizer/events/${before.event_id}/participants`);
  revalidatePath(`/organizer/events/${before.event_id}/teams`);
  return { ok: true };
}

export async function removeParticipant(registrationId: string): Promise<ActionResult> {
  const { ctx, error } = await requirePermission("add_remove_participants");
  if (!ctx) return fail(error!);

  const supabase = await createClient();
  const { data: before } = await supabase
    .from("registrations")
    .select("event_id, participant_name, source")
    .eq("id", registrationId)
    .single();
  if (!before) return fail("Registration not found.");

  // Online registrations are cancelled, never deleted — the consumer needs the
  // history and any payment must stay auditable. Admin-added rows with no
  // money attached can go entirely.
  if (before.source === "online") {
    await supabase
      .from("registrations")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", registrationId);
  } else {
    await supabase.from("registrations").delete().eq("id", registrationId);
  }

  await audit(
    "participant.removed",
    "registration",
    registrationId,
    `Removed ${before.participant_name}`
  );
  revalidatePath(`/organizer/events/${before.event_id}/participants`);
  return { ok: true };
}

/* ============================================================== teams ===== */

export async function createTeam(
  eventId: string,
  name: string
): Promise<ActionResult<{ id: string }>> {
  const { ctx, error } = await requirePermission("manage_teams");
  if (!ctx) return fail(error!);
  if (!name.trim()) return fail("Give the team a name.");

  const supabase = await createClient();
  const { data, error: insErr } = await supabase
    .from("teams")
    .insert({ event_id: eventId, name: name.trim(), created_by: ctx.user.id })
    .select("id")
    .single();

  if (insErr) {
    return fail(
      insErr.code === "23505" ? "A team with that name already exists." : insErr.message
    );
  }

  await audit("team.created", "team", data.id, `Created team ${name.trim()}`);
  revalidatePath(`/organizer/events/${eventId}/teams`);
  return { ok: true, data: { id: data.id } };
}

export async function assignToTeam(
  registrationId: string,
  teamId: string | null
): Promise<ActionResult> {
  return updateParticipant(registrationId, { team_id: teamId });
}

/* ============================================================ payments ==== */

/**
 * D4: the organizer can record that they physically took cash, which moves the
 * payment to `processing`. Only a Super Admin can mark it `paid`.
 */
export async function recordCashCollected(paymentId: string): Promise<ActionResult> {
  const { ctx, error } = await requirePermission("view_payments");
  if (!ctx) return fail(error!);

  const supabase = await createClient();
  const { data: payment } = await supabase
    .from("payments")
    .select("id, event_id, status, reference_code")
    .eq("id", paymentId)
    .single();
  if (!payment) return fail("Payment not found.");
  if (payment.status !== "pending") {
    return fail("Only a pending payment can be marked as collected.");
  }

  await supabase
    .from("payments")
    .update({
      status: "processing",
      admin_note: "Cash collected by the organizer — awaiting Super Admin reconciliation",
    })
    .eq("id", paymentId);

  await audit(
    "payment.cash_collected",
    "payment",
    paymentId,
    `Organizer recorded cash for ${payment.reference_code}`
  );
  revalidatePath(`/organizer/events/${payment.event_id}/payments`);
  return { ok: true };
}

/* ============================================================ messages ==== */

export async function sendEventMessage(
  eventId: string,
  audience: Enums<"message_audience">,
  subject: string,
  body: string
): Promise<ActionResult<{ recipients: number }>> {
  const { ctx, error } = await requirePermission("send_notifications");
  if (!ctx) return fail(error!);
  if (!subject.trim() || !body.trim()) return fail("Subject and message are both required.");

  const supabase = await createClient();

  let q = supabase
    .from("registrations")
    .select("user_id, status, payment:payments ( status )")
    .eq("event_id", eventId)
    .neq("status", "cancelled");

  if (audience === "confirmed") q = q.eq("status", "confirmed");
  if (audience === "waitlisted") q = q.eq("status", "waitlisted");

  const { data: regs } = await q;

  let recipients = (regs ?? []).filter((r) => r.user_id);
  if (audience === "unpaid") {
    recipients = recipients.filter(
      (r) => r.payment && ["pending", "processing"].includes(r.payment.status)
    );
  }

  const userIds = [...new Set(recipients.map((r) => r.user_id!))];

  await supabase.from("event_messages").insert({
    event_id: eventId,
    sender_id: ctx.user.id,
    audience,
    subject: subject.trim(),
    body: body.trim(),
    recipient_count: userIds.length,
  });

  await notifyUsers(userIds, {
    type: "event.message",
    title: subject.trim(),
    body: body.trim(),
    link: "/my-events",
  });

  await audit(
    "message.sent",
    "event",
    eventId,
    `Messaged ${userIds.length} ${audience} participant(s)`
  );
  revalidatePath(`/organizer/events/${eventId}/messages`);
  return { ok: true, data: { recipients: userIds.length } };
}
