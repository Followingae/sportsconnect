import { PickEvent } from "@/components/portal/pick-event";

export const metadata = { title: "Messages" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <PickEvent title="Messages" section="messages" />;
}