import { notFound } from "next/navigation";
import { PortalBody } from "@/components/portal/shell";
import { getEventTeams, getOrganizerContext, getOrganizerEvent } from "@/lib/queries/organizer";
import { TeamsBoard } from "@/components/portal/teams-board";

export const metadata = { title: "Teams" };

export default async function TeamsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [event, ctx, { teams, unassigned }] = await Promise.all([
    getOrganizerEvent(id),
    getOrganizerContext(),
    getEventTeams(id),
  ]);
  if (!event) notFound();

  if (event.registration_model !== "team") {
    return (
      <PortalBody>
        <div className="rounded-panel border border-line p-8 text-center">
          <p className="text-[15px] font-extrabold">This is an individual event</p>
          <p className="mx-auto mt-1.5 max-w-[380px] text-[13px] text-ink-2">
            {event.format?.name} is played solo, so there are no teams to manage. Everyone
            appears under Participants.
          </p>
        </div>
      </PortalBody>
    );
  }

  return (
    <PortalBody>
      <TeamsBoard
        eventId={id}
        teams={teams}
        unassigned={unassigned ?? []}
        teamSize={event.config?.team_size ?? event.format?.default_team_size ?? null}
        substitutes={event.config?.substitutes_per_team ?? 0}
        canEdit={Boolean(ctx?.can("manage_teams"))}
      />
    </PortalBody>
  );
}
