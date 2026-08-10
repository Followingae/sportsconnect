import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/database.types";

/**
 * Event Admin data access. RLS already restricts these to events the admin
 * owns or is assigned to (see can_manage_event in the schema), so these
 * queries don't repeat the ownership check.
 */

export async function getOrganizerContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: adminProfile }, { data: perms }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("event_admin_profiles")
      .select("*, organization:organizations ( id, name, logo_url )")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("event_admin_permissions").select("permission").eq("user_id", user.id),
  ]);

  const isSuper = profile?.role === "super_admin";

  return {
    user,
    profile,
    organization: adminProfile?.organization ?? null,
    // A Super Admin implicitly has every permission.
    permissions: new Set(
      isSuper ? ["*"] : (perms ?? []).map((p) => p.permission)
    ),
    isSuper,
    can(permission: string) {
      return isSuper || (perms ?? []).some((p) => p.permission === permission);
    },
  };
}

const EVENT_LIST_FIELDS = `
  id, slug, name, status, starts_at, registration_closes_at,
  price_amount, price_unit, currency, registration_model, banner_url,
  review_note, reviewed_at,
  sport:sports ( slug, name, cover_url ),
  format:sport_formats ( name ),
  config:event_config ( max_participants, max_teams )
`;

export async function getOrganizerEvents(filters?: {
  status?: Enums<"event_status">;
  query?: string;
}) {
  const supabase = await createClient();
  let q = supabase.from("events").select(EVENT_LIST_FIELDS).order("starts_at", {
    ascending: false,
  });

  if (filters?.status) q = q.eq("status", filters.status);
  if (filters?.query) q = q.ilike("name", `%${filters.query}%`);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

/** Counts used by the dashboard KPIs and the event list, in one pass. */
export async function getOrganizerStats() {
  const supabase = await createClient();

  const [events, registrations, payments] = await Promise.all([
    supabase.from("events").select("id, status, starts_at"),
    supabase.from("registrations").select("id, event_id, status"),
    supabase.from("payments").select("id, status, total_amount, event_id"),
  ]);

  const ev = events.data ?? [];
  const regs = registrations.data ?? [];
  const pays = payments.data ?? [];
  const now = Date.now();

  const liveStatuses: Enums<"event_status">[] = [
    "published",
    "registration_open",
    "registration_closed",
    "sold_out",
  ];

  const collected = pays
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.total_amount), 0);

  const expected = pays
    .filter((p) => ["pending", "processing", "paid"].includes(p.status))
    .reduce((s, p) => s + Number(p.total_amount), 0);

  return {
    totalEvents: ev.length,
    draft: ev.filter((e) => e.status === "draft").length,
    pendingApproval: ev.filter((e) =>
      ["submitted", "under_review"].includes(e.status)
    ).length,
    changesRequested: ev.filter((e) => e.status === "changes_requested").length,
    approved: ev.filter((e) => liveStatuses.includes(e.status) || e.status === "approved")
      .length,
    upcoming: ev.filter((e) => new Date(e.starts_at).getTime() > now).length,
    registrations: regs.filter((r) => r.status !== "cancelled").length,
    pendingPayments: pays.filter((p) => ["pending", "processing"].includes(p.status)).length,
    pendingPaymentValue: pays
      .filter((p) => ["pending", "processing"].includes(p.status))
      .reduce((s, p) => s + Number(p.total_amount), 0),
    collected,
    // D4: the organizer never holds the money, so this is framed as expected.
    expected,
  };
}

export async function getOrganizerEvent(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(
      `*,
       sport:sports ( id, slug, name, cover_url ),
       format:sport_formats ( id, slug, name, registration_model, default_team_size ),
       config:event_config ( * ),
       organization:organizations ( id, name ),
       questions:custom_questions ( * )`
    )
    .eq("id", eventId)
    .maybeSingle();
  return data;
}

export async function getEventParticipants(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("registrations")
    .select(
      `id, participant_name, participant_email, participant_phone, role, status,
       source, registered_at, waitlist_position, notes, is_captain,
       team:teams ( id, name ),
       payment:payments ( id, reference_code, status, method, total_amount, currency )`
    )
    .eq("event_id", eventId)
    .order("registered_at", { ascending: false });
  return data ?? [];
}

export async function getEventTeams(eventId: string) {
  const supabase = await createClient();
  const [teams, members] = await Promise.all([
    supabase.from("teams").select("id, name, notes").eq("event_id", eventId).order("name"),
    supabase
      .from("registrations")
      .select("id, participant_name, role, status, team_id, is_captain")
      .eq("event_id", eventId),
  ]);

  const byTeam = new Map<string, typeof members.data>();
  const unassigned: NonNullable<typeof members.data> = [];

  for (const m of members.data ?? []) {
    if (!m.team_id) {
      unassigned.push(m);
      continue;
    }
    if (!byTeam.has(m.team_id)) byTeam.set(m.team_id, []);
    byTeam.get(m.team_id)!.push(m);
  }

  return {
    teams: (teams.data ?? []).map((t) => ({ ...t, members: byTeam.get(t.id) ?? [] })),
    unassigned,
  };
}

export async function getEventPayments(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payments")
    .select(
      `id, reference_code, status, method, total_amount, subtotal_amount,
       platform_fee_amount, currency, created_at, marked_paid_at, payer_reference,
       registration:registrations ( id, participant_name, participant_email,
                                    team:teams ( name ) )`
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getEventMessages(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("event_messages")
    .select("*, sender:profiles ( full_name )")
    .eq("event_id", eventId)
    .order("sent_at", { ascending: false });
  return data ?? [];
}
