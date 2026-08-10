import { PortalHeader, PortalBody } from "@/components/portal/shell";
import { getRefunds } from "@/lib/queries/admin";
import { RefundsTable, type RefundRow } from "@/components/portal/refunds-table";
import { money } from "@/lib/format";

export const metadata = { title: "Refunds" };

export default async function AdminRefundsPage() {
  const refunds = await getRefunds();
  const open = refunds.filter((r) =>
    ["requested", "approved", "processing"].includes(r.status)
  );
  const toProcess = open.reduce((s, r) => s + Number(r.amount), 0);

  return (
    <>
      <PortalHeader
        crumb="Finance"
        title="Refunds & cancellations"
        actions={
          <span className="text-[13px] text-ink-2">
            To process <b className="text-ink">{money(toProcess)}</b>
          </span>
        }
      />
      <PortalBody>
        <RefundsTable rows={refunds as unknown as RefundRow[]} />
        <p className="mt-3 text-[11.5px] leading-relaxed text-ink-3">
          There is no payment gateway yet, so approving a refund records the decision and
          the amount. Send the money back by bank transfer, then note the settlement
          reference here so the trail is complete.
        </p>
      </PortalBody>
    </>
  );
}
