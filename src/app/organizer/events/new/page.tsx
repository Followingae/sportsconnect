import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrganizerContext } from "@/lib/queries/organizer";
import { resolveFee } from "@/lib/queries/settings";
import { EventBuilder } from "@/components/portal/event-builder";

export const metadata = { title: "Create event" };
export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  const ctx = await getOrganizerContext();
  if (!ctx) redirect("/login?next=/organizer/events/new");

  if (!ctx.can("create_event")) {
    return (
      <div className="px-5 py-14 text-center">
        <h1 className="text-h3">You can&apos;t create events</h1>
        <p className="mx-auto mt-2 max-w-[380px] text-[13.5px] text-ink-2">
          Your account doesn&apos;t have the &ldquo;Create event&rdquo; permission. Ask a
          Super Admin to grant it.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const [sports, formats, fee] = await Promise.all([
    supabase.from("sports").select("id, slug, name, cover_url").eq("is_active", true).order("sort_order"),
    supabase
      .from("sport_formats")
      .select("id, sport_id, slug, name, registration_model, default_team_size, default_substitutes")
      .eq("is_active", true)
      .order("sort_order"),
    resolveFee(),
  ]);

  return (
    <EventBuilder
      sports={sports.data ?? []}
      formats={formats.data ?? []}
      fee={fee}
    />
  );
}
