import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/database.types";

/**
 * Super Admin reads. RLS already grants a super_admin full visibility, so the
 * normal request-scoped client is used everywhere except where we deliberately
 * need to bypass it (creating auth users).
 */

export async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin" || profile.status !== "active") return null;
  return { user, profile };
}

/** BRD §19 — all eleven dashboard KPIs, in one pass over the tables. */
export async function getPlatformStats() {
  const supabase = await createClient();

  const [events, profiles, registrations, payments, refunds] = await Promise.all([
    supabase.from("events").select("id, status, starts_at, sport_id, created_at"),
    supabase.from("profiles").select("id, role, status"),
    supabase.from("registrations").select("id, status, registered_at, event_id"),
    supabase.from("payments").select("id, status, total_amount, created_at, event_id"),
    supabase.from("refunds").select("id, status, amount"),
  ]);

  const ev = events.data ?? [];
  const pf = profiles.data ?? [];
  const rg = (registrations.data ?? []).filter((r) => r.status !== "cancelled");
  const py = payments.data ?? [];
  const rf = refunds.data ?? [];
  const now = Date.now();

  const activeStatuses: Enums<"event_status">[] = [
    "published",
    "registration_open",
    "registration_closed",
    "sold_out",
  ];

  const sum = (rows: { total_amount: number }[]) =>
    rows.reduce((s, r) => s + Number(r.total_amount), 0);

  return {
    totalEvents: ev.length,
    pendingApprovals: ev.filter((e) => ["submitted", "under_review"].includes(e.status))
      .length,
    upcomingEvents: ev.filter((e) => new Date(e.starts_at).getTime() > now).length,
    activeEvents: ev.filter((e) => activeStatuses.includes(e.status)).length,
    cancelledEvents: ev.filter((e) => e.status === "cancelled").length,
    totalConsumers: pf.filter((p) => p.role === "consumer").length,
    totalEventAdmins: pf.filter((p) => p.role === "event_admin").length,
    totalRegistrations: rg.length,
    totalRevenue: sum(py.filter((p) => p.status === "paid")),
    pendingPaymentsCount: py.filter((p) => ["pending", "processing"].includes(p.status))
      .length,
    pendingPaymentsValue: sum(py.filter((p) => ["pending", "processing"].includes(p.status))),
    awaitingVerification: py.filter((p) => p.status === "processing").length,
    refundsOpen: rf.filter((r) => ["requested", "approved", "processing"].includes(r.status))
      .length,
    refundsValue: rf
      .filter((r) => ["requested", "approved", "processing"].includes(r.status))
      .reduce((s, r) => s + Number(r.amount), 0),
    raw: { events: ev, registrations: rg, payments: py },
  };
}

const REVIEW_FIELDS = `
  id, slug, name, status, starts_at, ends_at, description, rules, eligibility,
  banner_url, venue_name, venue_address, price_amount, price_unit, currency,
  registration_model, registration_opens_at, registration_closes_at,
  cancellation_policy, whats_included, submitted_at, review_note, is_featured,
  sport:sports ( id, name, slug, cover_url ),
  format:sport_formats ( name ),
  config:event_config ( * ),
  organizer:profiles!events_organizer_id_fkey ( id, full_name, email ),
  organization:organizations ( id, name )
`;

export async function getApprovalQueue() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(REVIEW_FIELDS)
    .in("status", ["submitted", "under_review", "changes_requested"])
    .order("submitted_at", { ascending: true, nullsFirst: false });
  return data ?? [];
}

export async function getEventForReview(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("events").select(REVIEW_FIELDS).eq("id", id).maybeSingle();
  return data;
}

export async function getAllEvents(filters?: {
  status?: Enums<"event_status">;
  query?: string;
  sport?: string;
}) {
  const supabase = await createClient();
  let q = supabase
    .from("events")
    .select(
      `id, slug, name, status, starts_at, is_featured, banner_url, price_amount, currency,
       sport:sports ( slug, name, cover_url ),
       organization:organizations ( name ),
       organizer:profiles!events_organizer_id_fkey ( full_name )`
    )
    .order("starts_at", { ascending: false });

  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.query) q = q.ilike("name", `%${filters.query}%`);
  if (filters?.sport) q = q.eq("sport.slug", filters.sport);

  const { data } = await q;
  return data ?? [];
}

export async function getEventAdmins() {
  const supabase = await createClient();
  const [{ data: profiles }, { data: admins }, { data: perms }, { data: events }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("role", "event_admin").order("full_name"),
      supabase
        .from("event_admin_profiles")
        .select("user_id, title, organization:organizations ( id, name )"),
      supabase.from("event_admin_permissions").select("user_id, permission"),
      supabase.from("events").select("id, name, organizer_id"),
    ]);

  return (profiles ?? []).map((p) => ({
    ...p,
    organization: admins?.find((a) => a.user_id === p.id)?.organization ?? null,
    permissions: (perms ?? []).filter((x) => x.user_id === p.id).map((x) => x.permission),
    eventCount: (events ?? []).filter((e) => e.organizer_id === p.id).length,
  }));
}

export async function getConsumers(query?: string) {
  const supabase = await createClient();
  let q = supabase.from("profiles").select("*").eq("role", "consumer");
  if (query) q = q.or(`full_name.ilike.%${query}%,email.ilike.%${query}%`);

  const [{ data: profiles }, { data: regs }, { data: pays }] = await Promise.all([
    q.order("created_at", { ascending: false }),
    supabase.from("registrations").select("user_id, status"),
    supabase
      .from("payments")
      .select("total_amount, status, registration:registrations ( user_id )"),
  ]);

  return (profiles ?? []).map((p) => ({
    ...p,
    registrations: (regs ?? []).filter((r) => r.user_id === p.id && r.status !== "cancelled")
      .length,
    spend: (pays ?? [])
      .filter((x) => x.status === "paid" && x.registration?.user_id === p.id)
      .reduce((s, x) => s + Number(x.total_amount), 0),
  }));
}

export async function getConsumerDetail(id: string) {
  const supabase = await createClient();
  const [{ data: profile }, { data: registrations }, { data: credits }, { data: discounts }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("registrations")
        .select(
          `id, status, registered_at,
           event:events ( id, slug, name, starts_at ),
           payment:payments ( reference_code, total_amount, currency, status )`
        )
        .eq("user_id", id)
        .order("registered_at", { ascending: false }),
      supabase.from("account_credits").select("*").eq("user_id", id),
      supabase.from("account_discounts").select("*").eq("user_id", id),
    ]);

  return {
    profile,
    registrations: registrations ?? [],
    credits: credits ?? [],
    discounts: discounts ?? [],
  };
}

export async function getAllPayments(status?: Enums<"payment_status">) {
  const supabase = await createClient();
  let q = supabase
    .from("payments")
    .select(
      `id, reference_code, status, method, total_amount, platform_fee_amount, currency,
       created_at, marked_paid_at, payer_reference, admin_note,
       event:events ( id, name, slug ),
       registration:registrations ( id, participant_name, participant_email,
                                    user_id, team:teams ( name ) )`
    )
    .order("created_at", { ascending: false });

  if (status) q = q.eq("status", status);
  const { data } = await q;
  return data ?? [];
}

export async function getRefunds() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("refunds")
    .select(
      `id, amount, currency, type, status, reason, policy_applied, created_at,
       processed_at, settlement_note, initiated_by_role,
       payment:payments ( reference_code, total_amount, method ),
       registration:registrations ( participant_name, user_id,
                                    event:events ( name, slug ) )`
    )
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getGrants() {
  const supabase = await createClient();
  const [{ data: credits }, { data: discounts }] = await Promise.all([
    supabase
      .from("account_credits")
      .select("*, user:profiles!account_credits_user_id_fkey ( id, full_name, email )")
      .order("created_at", { ascending: false }),
    supabase
      .from("account_discounts")
      .select("*, user:profiles!account_discounts_user_id_fkey ( id, full_name, email )")
      .order("created_at", { ascending: false }),
  ]);
  return { credits: credits ?? [], discounts: discounts ?? [] };
}

export async function getAuditLog(limit = 100) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("*, actor:profiles ( full_name, email )")
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function getSportsWithFormats() {
  const supabase = await createClient();
  const [{ data: sports }, { data: formats }, { data: events }] = await Promise.all([
    supabase.from("sports").select("*").order("sort_order"),
    supabase.from("sport_formats").select("*").order("sort_order"),
    supabase.from("events").select("id, sport_id"),
  ]);

  return (sports ?? []).map((s) => ({
    ...s,
    formats: (formats ?? []).filter((f) => f.sport_id === s.id),
    eventCount: (events ?? []).filter((e) => e.sport_id === s.id).length,
  }));
}

export async function getFeeConfig() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("platform_fee_config")
    .select("*, sport:sports ( name )")
    .eq("is_active", true);
  return data ?? [];
}

/** Used only when creating an Event Admin, which needs an auth user. */
export function adminAuthClient() {
  return createAdminClient();
}
