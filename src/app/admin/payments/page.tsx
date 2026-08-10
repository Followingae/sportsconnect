import { PortalHeader, PortalBody } from "@/components/portal/shell";
import { getAllPayments, getPlatformStats } from "@/lib/queries/admin";
import { KpiTile } from "@/components/ui/card";
import { AdminPaymentsTable, type AdminPaymentRow } from "@/components/portal/admin-payments-table";
import { money } from "@/lib/format";
import type { Enums } from "@/lib/database.types";

export const metadata = { title: "Payments" };

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const [payments, stats] = await Promise.all([
    getAllPayments(sp.status as Enums<"payment_status"> | undefined),
    getPlatformStats(),
  ]);

  return (
    <>
      <PortalHeader
        crumb="Finance"
        title="Payments"
        actions={
          <span className="text-[13px] text-ink-2">
            Outstanding <b className="text-ink">{money(stats.pendingPaymentsValue)}</b>
          </span>
        }
      />
      <PortalBody>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile
            label="Awaiting verification"
            value={stats.awaitingVerification}
            hint="Reported by consumer or organizer"
          />
          <KpiTile
            label="Not paid yet"
            value={stats.pendingPaymentsCount - stats.awaitingVerification}
          />
          <KpiTile label="Outstanding" value={money(stats.pendingPaymentsValue)} />
          <KpiTile label="Reconciled" value={money(stats.totalRevenue)} emphasis />
        </div>

        <div className="mt-4">
          <AdminPaymentsTable
            rows={payments as unknown as AdminPaymentRow[]}
            initialStatus={sp.status ?? "all"}
          />
        </div>

        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
          This is the only place a payment becomes <strong>Paid</strong>. Marking one paid
          also confirms the participant&apos;s place and emails them.
        </p>
      </PortalBody>
    </>
  );
}
