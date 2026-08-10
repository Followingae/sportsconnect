import { notFound } from "next/navigation";
import { PortalBody } from "@/components/portal/shell";
import {
  getEventPayments,
  getOrganizerContext,
  getOrganizerEvent,
} from "@/lib/queries/organizer";
import { KpiTile } from "@/components/ui/card";
import { EventPaymentsTable, type PaymentRow } from "@/components/portal/payments-table";
import { money } from "@/lib/format";

export const metadata = { title: "Payments" };

export default async function EventPaymentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, ctx, payments] = await Promise.all([
    getOrganizerEvent(id),
    getOrganizerContext(),
    getEventPayments(id),
  ]);
  if (!event) notFound();

  const sum = (f: (p: (typeof payments)[number]) => boolean) =>
    payments.filter(f).reduce((s, p) => s + Number(p.total_amount), 0);

  const expected = sum((p) => ["pending", "processing", "paid"].includes(p.status));
  const collected = sum((p) => p.status === "paid");
  const awaiting = sum((p) => p.status === "processing");
  const outstanding = sum((p) => p.status === "pending");

  return (
    <PortalBody>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label="Expected collection"
          value={money(expected, event.currency)}
          emphasis
        />
        <KpiTile
          label="Reconciled"
          value={money(collected, event.currency)}
          hint="Confirmed by Super Admin"
        />
        <KpiTile
          label="Awaiting verification"
          value={money(awaiting, event.currency)}
          hint={`${payments.filter((p) => p.status === "processing").length} payment(s)`}
        />
        <KpiTile
          label="Not paid yet"
          value={money(outstanding, event.currency)}
          hint={`${payments.filter((p) => p.status === "pending").length} payment(s)`}
        />
      </div>

      <div className="mt-4">
        <EventPaymentsTable
          rows={payments as unknown as PaymentRow[]}
          canEdit={Boolean(ctx?.can("view_payments"))}
        />
      </div>

      <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
        Sportsconnect collects and reconciles every payment, including cash taken at the
        venue. Recording cash here marks it <strong>awaiting verification</strong>; a Super
        Admin confirms it as paid.
      </p>
    </PortalBody>
  );
}
