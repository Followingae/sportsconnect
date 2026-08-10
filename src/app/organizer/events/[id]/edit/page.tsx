import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrganizerEvent } from "@/lib/queries/organizer";
import { resolveFee } from "@/lib/queries/settings";
import { EventBuilder } from "@/components/portal/event-builder";

export const metadata = { title: "Edit event" };
export const dynamic = "force-dynamic";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getOrganizerEvent(id);
  if (!event) notFound();

  const supabase = await createClient();
  const [sports, formats, fee] = await Promise.all([
    supabase
      .from("sports")
      .select("id, slug, name, cover_url")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("sport_formats")
      .select(
        "id, sport_id, slug, name, registration_model, default_team_size, default_substitutes"
      )
      .eq("is_active", true)
      .order("sort_order"),
    resolveFee(event.id, event.sport_id),
  ]);

  return (
    <EventBuilder
      sports={sports.data ?? []}
      formats={formats.data ?? []}
      fee={fee}
      initial={{
        id: event.id,
        status: event.status,
        review_note: event.review_note,
        name: event.name,
        sport_id: event.sport_id,
        format_id: event.format_id ?? "",
        description: event.description,
        venue_name: event.venue_name,
        venue_address: event.venue_address,
        starts_at: event.starts_at,
        ends_at: event.ends_at,
        registration_opens_at: event.registration_opens_at,
        registration_closes_at: event.registration_closes_at,
        registration_model: event.registration_model,
        price_amount: Number(event.price_amount),
        price_unit: event.price_unit as "per_player" | "per_team",
        tax_percent: Number(event.tax_percent),
        rules: event.rules,
        eligibility: event.eligibility,
        participant_requirements: event.participant_requirements,
        cancellation_policy: event.cancellation_policy,
        whats_included: event.whats_included ?? [],
        contact_email: event.contact_email,
        contact_phone: event.contact_phone,
        banner_url: event.banner_url,
        config: event.config
          ? {
              max_participants: event.config.max_participants,
              min_participants: event.config.min_participants,
              waitlist_capacity: event.config.waitlist_capacity,
              min_age: event.config.min_age,
              max_age: event.config.max_age,
              gender_requirement: event.config.gender_requirement,
              skill_levels: event.config.skill_levels ?? [],
              team_size: event.config.team_size,
              max_teams: event.config.max_teams,
              substitutes_per_team: event.config.substitutes_per_team,
              allow_individual_join: event.config.allow_individual_join,
            }
          : undefined,
      }}
    />
  );
}
