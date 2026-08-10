import { createClient } from "@/lib/supabase/server";

/** Everything the signed-in consumer's own account screens need. */

const REG_FIELDS = `
  id, status, role, registered_at, cancelled_at, waitlist_position, team_id,
  participant_name,
  event:events (
    id, slug, name, banner_url, starts_at, venue_name, status,
    currency, price_unit, registration_closes_at, cancellation_policy,
    sport:sports ( slug, name, cover_url ),
    format:sport_formats ( name )
  ),
  team:teams ( id, name ),
  payment:payments ( id, reference_code, total_amount, currency, status, method )
`;

export async function getMyRegistrations(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("registrations")
    .select(REG_FIELDS)
    .eq("user_id", userId)
    .order("registered_at", { ascending: false });

  if (error) throw error;

  const rows = data ?? [];
  const now = Date.now();

  const isPast = (r: (typeof rows)[number]) =>
    r.event ? new Date(r.event.starts_at).getTime() < now : false;

  return {
    upcoming: rows.filter(
      (r) => r.status !== "cancelled" && r.status !== "waitlisted" && !isPast(r)
    ),
    waitlist: rows.filter((r) => r.status === "waitlisted"),
    past: rows.filter((r) => r.status !== "cancelled" && isPast(r)),
    cancelled: rows.filter((r) => r.status === "cancelled"),
    all: rows,
  };
}

export async function getMyRegistration(userId: string, registrationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("registrations")
    .select(
      `${REG_FIELDS},
       answers:registration_answers ( value, question:custom_questions ( label, type ) )`
    )
    .eq("id", registrationId)
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

/** Payment history + refunds for the Payments tab (BRD §26). */
export async function getMyPayments(userId: string) {
  const supabase = await createClient();

  const { data: regs } = await supabase
    .from("registrations")
    .select("id")
    .eq("user_id", userId);

  const ids = (regs ?? []).map((r) => r.id);
  if (ids.length === 0) return { payments: [], refunds: [] };

  const [payments, refunds] = await Promise.all([
    supabase
      .from("payments")
      .select(
        `id, reference_code, total_amount, currency, status, method, created_at,
         marked_paid_at,
         event:events ( slug, name, sport:sports ( cover_url ) )`
      )
      .in("registration_id", ids)
      .order("created_at", { ascending: false }),
    supabase
      .from("refunds")
      .select(
        `id, amount, currency, status, type, reason, created_at, processed_at,
         registration:registrations ( event:events ( name, slug ) )`
      )
      .in("registration_id", ids)
      .order("created_at", { ascending: false }),
  ]);

  return { payments: payments.data ?? [], refunds: refunds.data ?? [] };
}

export async function getMyNotifications(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  return data ?? [];
}

export async function getUnreadNotificationCount(userId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  return count ?? 0;
}
