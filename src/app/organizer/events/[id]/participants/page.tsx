import { notFound } from "next/navigation";
import { PortalBody } from "@/components/portal/shell";
import {
  getEventParticipants,
  getEventTeams,
  getOrganizerContext,
  getOrganizerEvent,
} from "@/lib/queries/organizer";
import { ParticipantsTable, type ParticipantRow } from "@/components/portal/participants-table";

export const metadata = { title: "Participants" };

export default async function ParticipantsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, ctx, rows, { teams }] = await Promise.all([
    getOrganizerEvent(id),
    getOrganizerContext(),
    getEventParticipants(id),
    getEventTeams(id),
  ]);
  if (!event) notFound();

  return (
    <PortalBody>
      <ParticipantsTable
        eventId={id}
        rows={rows as unknown as ParticipantRow[]}
        teams={teams.map((t) => ({ id: t.id, name: t.name }))}
        canEdit={Boolean(ctx?.can("manage_participants"))}
      />
    </PortalBody>
  );
}
