"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/lib/queries/admin";
import { canTransition, DEFAULT_PERMISSIONS } from "@/lib/status";
import { notifyUsers } from "@/lib/actions/notifications";
import { SITE_URL } from "@/lib/env";
import type { Enums, TablesUpdate } from "@/lib/database.types";

export type Result<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

const fail = (error: string) => ({ ok: false as const, error });

async function guard() {
  const ctx = await requireSuperAdmin();
  return ctx ?? null;
}

async function audit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string | null,
  summary: string
) {
  const supabase = await createClient();
  await supabase.from("audit_log").insert({
    actor_id: actorId,
    actor_role: "super_admin",
    action,
    entity_type: entityType,
    entity_id: entityId,
    summary,
  });
}

/* ======================================================= event approval === */

export async function decideEvent(
  eventId: string,
  decision: "approve" | "request_changes" | "reject",
  note?: string
): Promise<Result> {
  const ctx = await guard();
  if (!ctx) return fail("Super Admin only.");

  if (decision !== "approve" && !note?.trim()) {
    return fail("Leave a note so the organizer knows what to fix.");
  }

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, name, status, organizer_id, registration_opens_at")
    .eq("id", eventId)
    .single();
  if (!event) return fail("Event not found.");

  const target: Enums<"event_status"> =
    decision === "approve"
      ? "approved"
      : decision === "reject"
        ? "rejected"
        : "changes_requested";

  if (!canTransition(event.status, target)) {
    return fail(`A ${event.status.replace(/_/g, " ")} event can't be ${decision}d.`);
  }

  const now = new Date().toISOString();
  await supabase
    .from("events")
    .update({
      status: target,
      reviewed_at: now,
      reviewed_by: ctx.user.id,
      review_note: note?.trim() || null,
    })
    .eq("id", eventId);

  await notifyUsers([event.organizer_id], {
    type: `event.${decision}`,
    title:
      decision === "approve"
        ? `${event.name} was approved`
        : decision === "reject"
          ? `${event.name} was not approved`
          : `Changes requested on ${event.name}`,
    body: note?.trim() || "Open the event to see the details.",
    link: `/organizer/events/${eventId}`,
  });

  await audit(
    ctx.user.id,
    `event.${decision}`,
    "event",
    eventId,
    `${decision} — ${event.name}${note ? `: ${note.trim()}` : ""}`
  );

  revalidatePath("/admin/approvals");
  revalidatePath("/admin/events");
  return { ok: true };
}

/** Approve → publish → open registration are separate, deliberate steps. */
export async function setEventStatus(
  eventId: string,
  target: Enums<"event_status">,
  reason?: string
): Promise<Result> {
  const ctx = await guard();
  if (!ctx) return fail("Super Admin only.");

  const supabase = await createClient();
  const { data: event } = await supabase
    .from("events")
    .select("id, name, status, organizer_id")
    .eq("id", eventId)
    .single();
  if (!event) return fail("Event not found.");

  if (!canTransition(event.status, target)) {
    return fail(
      `Can't move from ${event.status.replace(/_/g, " ")} to ${target.replace(/_/g, " ")}.`
    );
  }

  const patch: TablesUpdate<"events"> = { status: target };
  if (target === "published") patch.published_at = new Date().toISOString();
  if (target === "cancelled") {
    patch.cancelled_at = new Date().toISOString();
    patch.cancellation_reason = reason?.trim() || "Cancelled by Sportsconnect";
  }

  await supabase.from("events").update(patch).eq("id", eventId);

  await notifyUsers([event.organizer_id], {
    type: "event.status",
    title: `${event.name} is now ${target.replace(/_/g, " ")}`,
    body: reason?.trim(),
    link: `/organizer/events/${eventId}`,
  });

  await audit(
    ctx.user.id,
    "event.status_changed",
    "event",
    eventId,
    `${event.name}: ${event.status} → ${target}`
  );

  revalidatePath("/admin/events");
  revalidatePath(`/admin/events/${eventId}`);
  return { ok: true };
}

export async function toggleFeatured(eventId: string, featured: boolean): Promise<Result> {
  const ctx = await guard();
  if (!ctx) return fail("Super Admin only.");

  const supabase = await createClient();
  await supabase.from("events").update({ is_featured: featured }).eq("id", eventId);
  await audit(
    ctx.user.id,
    "event.featured",
    "event",
    eventId,
    featured ? "Featured on home" : "Unfeatured"
  );
  revalidatePath("/admin/events");
  revalidatePath("/home");
  return { ok: true };
}

/* ============================================================= payments === */

/**
 * D4 — this is the only place a payment becomes `paid`. Everything upstream can
 * report money as collected; only the Super Admin confirms it landed.
 */
export async function markPaymentPaid(
  paymentId: string,
  note?: string
): Promise<Result> {
  const ctx = await guard();
  if (!ctx) return fail("Super Admin only.");

  const supabase = await createClient();
  const { data: payment } = await supabase
    .from("payments")
    .select(
      "id, status, reference_code, total_amount, currency, registration_id, event_id"
    )
    .eq("id", paymentId)
    .single();
  if (!payment) return fail("Payment not found.");
  if (payment.status === "paid") return fail("Already marked paid.");

  await supabase
    .from("payments")
    .update({
      status: "paid",
      marked_paid_by: ctx.user.id,
      marked_paid_at: new Date().toISOString(),
      admin_note: note?.trim() || null,
    })
    .eq("id", paymentId);

  // Paying confirms the place.
  const { data: reg } = await supabase
    .from("registrations")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString() })
    .eq("id", payment.registration_id)
    .select("user_id, event:events ( name, slug )")
    .single();

  if (reg?.user_id) {
    await notifyUsers([reg.user_id], {
      type: "payment.received",
      title: "Payment confirmed",
      body: `We've received ${payment.currency} ${payment.total_amount} for ${reg.event?.name ?? "your event"}. Your place is confirmed.`,
      link: "/my-events",
    });
  }

  await audit(
    ctx.user.id,
    "payment.marked_paid",
    "payment",
    paymentId,
    `Marked ${payment.reference_code} paid (${payment.currency} ${payment.total_amount})`
  );

  revalidatePath("/admin/payments");
  return { ok: true };
}

export async function markPaymentsPaid(ids: string[]): Promise<Result<{ count: number }>> {
  const ctx = await guard();
  if (!ctx) return fail("Super Admin only.");

  let count = 0;
  for (const id of ids) {
    const res = await markPaymentPaid(id);
    if (res.ok) count++;
  }
  revalidatePath("/admin/payments");
  return { ok: true, data: { count } };
}

/* ============================================================== refunds === */

export async function decideRefund(
  refundId: string,
  decision: "approve" | "decline",
  opts?: { amount?: number; note?: string }
): Promise<Result> {
  const ctx = await guard();
  if (!ctx) return fail("Super Admin only.");

  const supabase = await createClient();
  const { data: refund } = await supabase
    .from("refunds")
    .select("id, status, amount, payment_id, registration_id")
    .eq("id", refundId)
    .single();
  if (!refund) return fail("Refund not found.");
  if (!["requested", "approved", "processing"].includes(refund.status)) {
    return fail("This refund has already been settled.");
  }

  const now = new Date().toISOString();

  if (decision === "decline") {
    await supabase
      .from("refunds")
      .update({
        status: "declined",
        decided_by: ctx.user.id,
        decided_at: now,
        settlement_note: opts?.note?.trim() || null,
      })
      .eq("id", refundId);
  } else {
    const amount = opts?.amount ?? Number(refund.amount);
    const original = Number(refund.amount);

    await supabase
      .from("refunds")
      .update({
        status: "refunded",
        amount,
        type: amount < original ? "partial" : "full",
        decided_by: ctx.user.id,
        decided_at: now,
        processed_at: now,
        settlement_note: opts?.note?.trim() || null,
      })
      .eq("id", refundId);

    // There is no gateway (D3), so the money went back by hand. Mark the source
    // payment to match what was actually returned.
    const { data: payment } = await supabase
      .from("payments")
      .select("total_amount")
      .eq("id", refund.payment_id)
      .single();

    await supabase
      .from("payments")
      .update({
        status:
          payment && amount < Number(payment.total_amount)
            ? "partially_refunded"
            : "refunded",
      })
      .eq("id", refund.payment_id);
  }

  const { data: reg } = await supabase
    .from("registrations")
    .select("user_id")
    .eq("id", refund.registration_id)
    .single();

  if (reg?.user_id) {
    await notifyUsers([reg.user_id], {
      type: `refund.${decision}`,
      title: decision === "approve" ? "Refund processed" : "Refund declined",
      body: opts?.note?.trim(),
      link: "/payments",
    });
  }

  await audit(
    ctx.user.id,
    `refund.${decision}`,
    "refund",
    refundId,
    `${decision} refund${opts?.amount ? ` of ${opts.amount}` : ""}`
  );

  revalidatePath("/admin/refunds");
  return { ok: true };
}

/* ======================================================== event admins === */

const createAdminSchema = z.object({
  full_name: z.string().trim().min(2, "Enter their name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  phone: z.string().trim().optional(),
  organization: z.string().trim().min(2, "Name the organization."),
  permissions: z.array(z.string()).default([]),
});

export type CreateAdminInput = z.input<typeof createAdminSchema>;

export async function createEventAdmin(
  input: CreateAdminInput
): Promise<Result<{ id: string; tempPassword: string }>> {
  const ctx = await guard();
  if (!ctx) return fail("Super Admin only.");

  const parsed = createAdminSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;

  const admin = createAdminClient();
  const supabase = await createClient();

  // Random first password. They're told to reset it immediately, and the reset
  // email goes out below.
  const tempPassword = `Sc-${crypto.randomUUID().slice(0, 12)}!`;

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email: d.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: d.full_name, phone: d.phone ?? null, role: "event_admin" },
  });

  if (authError || !created.user) {
    return fail(
      authError?.message.includes("already")
        ? "That email already has an account."
        : (authError?.message ?? "Couldn't create the account.")
    );
  }

  const userId = created.user.id;

  await supabase
    .from("profiles")
    .update({ role: "event_admin", full_name: d.full_name, phone: d.phone ?? null })
    .eq("id", userId);

  const { data: org } = await supabase
    .from("organizations")
    .insert({ name: d.organization, contact_email: d.email })
    .select("id")
    .single();

  await supabase.from("event_admin_profiles").upsert({
    user_id: userId,
    organization_id: org?.id ?? null,
    title: "Event Admin",
    created_by: ctx.user.id,
  });

  const perms = d.permissions.length ? d.permissions : DEFAULT_PERMISSIONS;
  await supabase.from("event_admin_permissions").insert(
    perms.map((permission) => ({
      user_id: userId,
      permission,
      granted_by: ctx.user.id,
    }))
  );

  await supabase.auth.resetPasswordForEmail(d.email, {
    redirectTo: `${SITE_URL}/auth/callback?next=/reset-password`,
  });

  await audit(
    ctx.user.id,
    "event_admin.created",
    "profile",
    userId,
    `Created Event Admin ${d.full_name} (${d.organization})`
  );

  revalidatePath("/admin/event-admins");
  return { ok: true, data: { id: userId, tempPassword } };
}

export async function setAdminPermissions(
  userId: string,
  permissions: string[]
): Promise<Result> {
  const ctx = await guard();
  if (!ctx) return fail("Super Admin only.");

  const supabase = await createClient();
  await supabase.from("event_admin_permissions").delete().eq("user_id", userId);

  if (permissions.length > 0) {
    await supabase.from("event_admin_permissions").insert(
      permissions.map((permission) => ({
        user_id: userId,
        permission,
        granted_by: ctx.user.id,
      }))
    );
  }

  await audit(
    ctx.user.id,
    "event_admin.permissions",
    "profile",
    userId,
    `Permissions set to: ${permissions.join(", ") || "none"}`
  );
  revalidatePath("/admin/event-admins");
  return { ok: true };
}

export async function setAccountStatus(
  userId: string,
  status: Enums<"account_status">
): Promise<Result> {
  const ctx = await guard();
  if (!ctx) return fail("Super Admin only.");
  if (userId === ctx.user.id) return fail("You can't change your own account status.");

  const supabase = await createClient();
  await supabase.from("profiles").update({ status }).eq("id", userId);
  await audit(ctx.user.id, "account.status", "profile", userId, `Status set to ${status}`);

  revalidatePath("/admin/event-admins");
  revalidatePath("/admin/consumers");
  return { ok: true };
}

/* =========================================================== grants ====== */

export async function grantToConsumer(
  userId: string,
  grant: { kind: "credit"; amount: number } | { kind: "discount"; percent: number },
  reason?: string
): Promise<Result> {
  const ctx = await guard();
  if (!ctx) return fail("Super Admin only.");

  const supabase = await createClient();

  if (grant.kind === "credit") {
    if (grant.amount <= 0) return fail("Enter an amount above zero.");
    await supabase.from("account_credits").insert({
      user_id: userId,
      amount: grant.amount,
      reason: reason?.trim() || null,
      granted_by: ctx.user.id,
    });
  } else {
    if (grant.percent <= 0 || grant.percent > 100) {
      return fail("A discount must be between 1 and 100 percent.");
    }
    // Only one active discount at a time — the consumer always gets the latest.
    await supabase
      .from("account_discounts")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("is_active", true);

    await supabase.from("account_discounts").insert({
      user_id: userId,
      percent: grant.percent,
      reason: reason?.trim() || null,
      granted_by: ctx.user.id,
    });
  }

  await notifyUsers([userId], {
    type: "account.grant",
    title:
      grant.kind === "credit"
        ? `You've been given AED ${grant.amount} credit`
        : `You've been given ${grant.percent}% off`,
    body: reason?.trim(),
    link: "/payments",
  });

  await audit(
    ctx.user.id,
    "account.grant",
    "profile",
    userId,
    grant.kind === "credit"
      ? `Granted AED ${grant.amount} credit`
      : `Granted ${grant.percent}% discount`
  );

  revalidatePath("/admin/consumers");
  revalidatePath("/admin/discounts");
  return { ok: true };
}

export async function revokeDiscount(discountId: string): Promise<Result> {
  const ctx = await guard();
  if (!ctx) return fail("Super Admin only.");

  const supabase = await createClient();
  await supabase.from("account_discounts").update({ is_active: false }).eq("id", discountId);
  await audit(ctx.user.id, "account.grant_revoked", "discount", discountId, "Discount revoked");
  revalidatePath("/admin/discounts");
  return { ok: true };
}

/* ======================================================= configuration === */

export async function upsertSport(input: {
  id?: string;
  slug: string;
  name: string;
  cover_url?: string;
  is_active: boolean;
  sort_order: number;
}): Promise<Result> {
  const ctx = await guard();
  if (!ctx) return fail("Super Admin only.");
  if (!input.name.trim() || !input.slug.trim()) return fail("Name and slug are required.");

  const supabase = await createClient();
  const { error } = await supabase.from("sports").upsert(
    {
      ...(input.id ? { id: input.id } : {}),
      slug: input.slug.trim().toLowerCase(),
      name: input.name.trim(),
      cover_url: input.cover_url || null,
      is_active: input.is_active,
      sort_order: input.sort_order,
    },
    { onConflict: "slug" }
  );

  if (error) return fail(error.message);
  await audit(ctx.user.id, "sport.saved", "sport", input.id ?? null, `Saved sport ${input.name}`);
  revalidatePath("/admin/sports");
  return { ok: true };
}

export async function upsertFormat(input: {
  id?: string;
  sport_id: string;
  slug: string;
  name: string;
  registration_model: Enums<"registration_model">;
  default_team_size?: number | null;
  default_substitutes: number;
  is_active: boolean;
}): Promise<Result> {
  const ctx = await guard();
  if (!ctx) return fail("Super Admin only.");

  const supabase = await createClient();
  const { error } = await supabase.from("sport_formats").upsert(
    {
      ...(input.id ? { id: input.id } : {}),
      sport_id: input.sport_id,
      slug: input.slug.trim().toLowerCase(),
      name: input.name.trim(),
      registration_model: input.registration_model,
      default_team_size: input.default_team_size ?? null,
      default_substitutes: input.default_substitutes,
      is_active: input.is_active,
    },
    { onConflict: "sport_id,slug" }
  );

  if (error) return fail(error.message);
  await audit(ctx.user.id, "format.saved", "sport_format", input.id ?? null, `Saved format ${input.name}`);
  revalidatePath("/admin/sports");
  return { ok: true };
}

export async function setPlatformFee(input: {
  mode: Enums<"fee_mode">;
  fixed_amount: number;
  percentage: number;
}): Promise<Result> {
  const ctx = await guard();
  if (!ctx) return fail("Super Admin only.");

  const supabase = await createClient();
  await supabase
    .from("platform_fee_config")
    .update({ is_active: false })
    .eq("scope", "global")
    .eq("is_active", true);

  const { error } = await supabase.from("platform_fee_config").insert({
    scope: "global",
    mode: input.mode,
    fixed_amount: input.fixed_amount,
    percentage: input.percentage,
    is_active: true,
    updated_by: ctx.user.id,
  });

  if (error) return fail(error.message);
  await audit(
    ctx.user.id,
    "settings.fee",
    "platform_fee_config",
    null,
    `Platform fee set to ${input.mode} (${input.percentage}% / ${input.fixed_amount})`
  );
  revalidatePath("/admin/sports");
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function savePlatformSettings(input: {
  bank_account_name?: string;
  bank_name?: string;
  bank_iban?: string;
  bank_swift?: string;
  support_email?: string;
  support_phone?: string;
  default_terms?: string;
  default_cancellation_policy?: string;
  payment_methods_enabled: Enums<"payment_method">[];
}): Promise<Result> {
  const ctx = await guard();
  if (!ctx) return fail("Super Admin only.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("platform_settings")
    .update({
      ...input,
      support_email: input.support_email || null,
      updated_by: ctx.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", true);

  if (error) return fail(error.message);
  await audit(ctx.user.id, "settings.saved", "platform_settings", null, "Platform settings updated");
  revalidatePath("/admin/settings");
  return { ok: true };
}
