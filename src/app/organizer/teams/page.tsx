import { PickEvent } from "@/components/portal/pick-event";

export const metadata = { title: "Teams" };
export const dynamic = "force-dynamic";

export default function Page() {
  return <PickEvent title="Teams" section="teams" />;
}