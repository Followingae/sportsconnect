import { PickEvent } from "@/components/portal/pick-event";

export const metadata = { title: "Participants" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <PickEvent title="Participants" section="participants" />;
}