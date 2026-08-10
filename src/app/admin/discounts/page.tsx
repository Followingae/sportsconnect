import Link from "next/link";
import { PortalHeader, PortalBody } from "@/components/portal/shell";
import { getGrants } from "@/lib/queries/admin";
import { KpiTile, Panel } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/feedback";
import { RevokeDiscountButton } from "@/components/portal/revoke-discount";
import { money, formatDate } from "@/lib/format";

export const metadata = { title: "Discounts & credit" };

export default async function DiscountsPage() {
  const { credits, discounts } = await getGrants();

  const activeDiscounts = discounts.filter((d) => d.is_active);
  const creditTotal = credits.reduce((s, c) => s + Number(c.amount), 0);

  return (
    <>
      <PortalHeader crumb="Finance" title="Discounts & credit" />
      <PortalBody>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile label="Active discounts" value={activeDiscounts.length} />
          <KpiTile label="Credit granted" value={money(creditTotal)} emphasis />
          <KpiTile label="Credit grants" value={credits.length} />
          <KpiTile label="Revoked" value={discounts.length - activeDiscounts.length} />
        </div>

        <p className="mt-4 text-[13px] text-ink-2">
          Grants are made from a consumer&apos;s profile.{" "}
          <Link href="/admin/consumers" className="font-bold text-volt-deep">
            Find a consumer
          </Link>
          .
        </p>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Panel title="Discounts" subtitle={`${discounts.length} total`}>
            {discounts.length === 0 ? (
              <EmptyState title="No discounts granted" />
            ) : (
              <ul className="divide-y divide-line">
                {discounts.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={d.user?.full_name || d.user?.email || "?"} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/consumers/${d.user_id}`}
                        className="block truncate text-[13.5px] font-bold"
                      >
                        {d.user?.full_name || d.user?.email}
                      </Link>
                      <p className="truncate text-[11px] text-ink-3">
                        {d.reason ?? "No reason given"} · {formatDate(d.created_at)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[14px] font-extrabold tabular-nums">
                      {d.percent}%
                    </span>
                    {d.is_active ? (
                      <RevokeDiscountButton id={d.id} />
                    ) : (
                      <Badge tone="neutral">Revoked</Badge>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Account credit" subtitle={`${credits.length} grants`}>
            {credits.length === 0 ? (
              <EmptyState title="No credit granted" />
            ) : (
              <ul className="divide-y divide-line">
                {credits.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={c.user?.full_name || c.user?.email || "?"} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/admin/consumers/${c.user_id}`}
                        className="block truncate text-[13.5px] font-bold"
                      >
                        {c.user?.full_name || c.user?.email}
                      </Link>
                      <p className="truncate text-[11px] text-ink-3">
                        {c.reason ?? "No reason given"} · {formatDate(c.created_at)}
                      </p>
                    </div>
                    <span className="shrink-0 text-[13.5px] font-extrabold tabular-nums">
                      {money(c.amount, c.currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </PortalBody>
    </>
  );
}
