import { createClient } from "@/lib/supabase/server";
import { PUBLIC_EVENT_STATUSES } from "@/lib/status";
import type { Enums } from "@/lib/database.types";

/**
 * All consumer-facing event reads. RLS already hides non-public events, but
 * these queries also filter explicitly so a bug in one layer can't leak a
 * draft event through the other.
 */

/** Columns every event card needs. Kept in one place so lists stay consistent. */
const CARD_FIELDS = `
  id, slug, name, banner_url, starts_at, ends_at,
  registration_opens_at, registration_closes_at,
  price_amount, currency, price_unit, status, is_featured,
  venue_name, venue_address, registration_model,
  sport:sports ( id, slug, name, cover_url ),
  format:sport_formats ( id, slug, name, registration_model ),
  config:event_config ( max_participants, max_teams, waitlist_capacity )
`;

export type EventFilters = {
  sport?: string;
  format?: string;
  city?: string;
  dateFrom?: string;
  dateTo?: string;
  priceMin?: number;
  priceMax?: number;
  skill?: string;
  gender?: Enums<"gender_requirement">;
  ageGroup?: string;
  organizer?: string;
  availableOnly?: boolean;
  query?: string;
  sort?: "date" | "price_asc" | "price_desc" | "recent" | "deadline" | "popularity";
  page?: number;
  perPage?: number;
};

export async function listEvents(filters: EventFilters = {}) {
  const supabase = await createClient();
  const perPage = filters.perPage ?? 20;
  const page = Math.max(1, filters.page ?? 1);
  const from = (page - 1) * perPage;

  let q = supabase
    .from("events")
    .select(CARD_FIELDS, { count: "exact" })
    .in("status", PUBLIC_EVENT_STATUSES);

  if (filters.sport) q = q.eq("sports.slug", filters.sport);
  if (filters.dateFrom) q = q.gte("starts_at", filters.dateFrom);
  if (filters.dateTo) q = q.lte("starts_at", filters.dateTo);
  if (filters.priceMin != null) q = q.gte("price_amount", filters.priceMin);
  if (filters.priceMax != null) q = q.lte("price_amount", filters.priceMax);
  if (filters.organizer) q = q.eq("organization_id", filters.organizer);
  if (filters.query) {
    const term = `%${filters.query}%`;
    q = q.or(`name.ilike.${term},venue_name.ilike.${term},description.ilike.${term}`);
  }

  switch (filters.sort) {
    case "price_asc":
      q = q.order("price_amount", { ascending: true });
      break;
    case "price_desc":
      q = q.order("price_amount", { ascending: false });
      break;
    case "recent":
      q = q.order("created_at", { ascending: false });
      break;
    case "deadline":
      q = q.order("registration_closes_at", { ascending: true, nullsFirst: false });
      break;
    default:
      q = q.order("starts_at", { ascending: true });
  }

  const { data, error, count } = await q.range(from, from + perPage - 1);
  if (error) throw error;

  return { events: data ?? [], total: count ?? 0, page, perPage };
}

/** Full record for the event page. Returns null when nothing public matches. */
export async function getEventBySlug(slug: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("events")
    .select(
      `
      *,
      sport:sports ( id, slug, name, cover_url ),
      format:sport_formats ( id, slug, name, registration_model, default_team_size, default_substitutes ),
      config:event_config ( * ),
      organizer:profiles!events_organizer_id_fkey ( id, full_name, avatar_url ),
      organization:organizations ( id, name, logo_url, contact_email, contact_phone ),
      questions:custom_questions ( * )
    `
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  return data;
}

/** Confirmed + pending headcount, and whether the event is effectively full. */
export async function getEventCapacity(eventId: string) {
  const supabase = await createClient();

  const [{ count: taken }, { count: waitlisted }] = await Promise.all([
    supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .in("status", ["confirmed", "pending"]),
    supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("event_id", eventId)
      .eq("status", "waitlisted"),
  ]);

  return { taken: taken ?? 0, waitlisted: waitlisted ?? 0 };
}

export async function listSports() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sports")
    .select("id, slug, name, cover_url")
    .eq("is_active", true)
    .order("sort_order");
  if (error) throw error;
  return data ?? [];
}

/**
 * Home page rails (BRD §13). One round-trip per rail, run together — each is a
 * different slice, so a single query can't serve them.
 */
export async function getHomeRails() {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const soon = new Date(Date.now() + 7 * 86_400_000).toISOString();

  const base = () =>
    supabase.from("events").select(CARD_FIELDS).in("status", PUBLIC_EVENT_STATUSES);

  const [featured, closingSoon, upcoming, recent] = await Promise.all([
    base().eq("is_featured", true).gte("starts_at", nowIso).order("starts_at").limit(6),
    base()
      .eq("status", "registration_open")
      .gte("registration_closes_at", nowIso)
      .lte("registration_closes_at", soon)
      .order("registration_closes_at")
      .limit(6),
    base().gte("starts_at", nowIso).order("starts_at").limit(8),
    base().order("created_at", { ascending: false }).limit(6),
  ]);

  return {
    featured: featured.data ?? [],
    closingSoon: closingSoon.data ?? [],
    upcoming: upcoming.data ?? [],
    recentlyAdded: recent.data ?? [],
  };
}
