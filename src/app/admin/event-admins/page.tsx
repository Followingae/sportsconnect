import { PortalHeader, PortalBody } from "@/components/portal/shell";
import { getEventAdmins } from "@/lib/queries/admin";
import { EventAdminsTable, type AdminRow } from "@/components/portal/event-admins-table";

export const metadata = { title: "Event Admins" };

export default async function EventAdminsPage() {
  const admins = await getEventAdmins();

  return (
    <>
      <PortalHeader crumb="People" title="Event Admins" />
      <PortalBody>
        <EventAdminsTable rows={admins as unknown as AdminRow[]} />
      </PortalBody>
    </>
  );
}
