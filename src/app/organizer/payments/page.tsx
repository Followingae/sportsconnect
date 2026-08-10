import { PickEvent } from "@/components/portal/pick-event";

export const metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <PickEvent title="Payments" section="payments" />;
}