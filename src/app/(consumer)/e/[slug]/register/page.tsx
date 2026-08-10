import { notFound, redirect } from "next/navigation";
import { getEventBySlug, getEventCapacity } from "@/lib/queries/events";
import { getPlatformSettings, resolveFee, getAccountPerks } from "@/lib/queries/settings";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { SetupNotice } from "@/components/setup-notice";
import { RegisterFlow } from "@/components/consumer/register-flow";
import { gateFor } from "@/lib/event-state";

export const metadata = { title: "Register" };
export const dynamic = "force-dynamic";

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ waitlist?: string }>;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const { slug } = await params;
  const { waitlist } = await searchParams;

  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=/e/${slug}/register`);

  const [counts, settings, fee, perks, profile] = await Promise.all([
    getEventCapacity(event.id),
    getPlatformSettings(),
    resolveFee(event.id, event.sport_id),
    getAccountPerks(user.id),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);

  const { data: existing } = await supabase
    .from("registrations")
    .select("status")
    .eq("event_id", event.id)
    .eq("user_id", user.id)
    .neq("status", "cancelled")
    .maybeSingle();

  // Re-run the same gate the event page used — a stale tab must not be able to
  // walk into a closed or full event.
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

  if (gate.kind !== "open" && gate.kind !== "waitlist") {
    redirect(`/e/${slug}`);
  }

  const questions = [...(event.questions ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );

  return (
    <RegisterFlow
      event={{
        id: event.id,
        slug: event.slug,
        name: event.name,
        starts_at: event.starts_at,
        registration_closes_at: event.registration_closes_at,
        price_amount: Number(event.price_amount),
        price_unit: event.price_unit,
        currency: event.currency,
        tax_percent: Number(event.tax_percent),
        registration_model: event.registration_model,
        venue_name: event.venue_name,
        cancellation_policy: event.cancellation_policy,
        teamSize: event.config?.team_size ?? event.format?.default_team_size ?? null,
        substitutes: event.config?.substitutes_per_team ?? 0,
      }}
      questions={questions}
      fee={fee}
      perks={perks}
      bank={{
        account_name: settings?.bank_account_name ?? null,
        bank_name: settings?.bank_name ?? null,
        iban: settings?.bank_iban ?? null,
        swift: settings?.bank_swift ?? null,
      }}
      viewerName={profile.data?.full_name || user.email || "You"}
      waitlistMode={waitlist === "1" || gate.kind === "waitlist"}
    />
  );
}
