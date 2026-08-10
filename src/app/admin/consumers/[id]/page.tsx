import Link from "next/link";
import { notFound } from "next/navigation";
import { PortalHeader, PortalBody } from "@/components/portal/shell";
import { getConsumerDetail } from "@/lib/queries/admin";
import { KpiTile, Panel, Divider } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import {
  RegistrationStatusBadge,
  PaymentStatusBadge,
  Badge,
} from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { ConsumerActions } from "@/components/portal/consumer-actions";
import { money, formatDate } from "@/lib/format";

export const metadata = { title: "Consumer" };

export default async function ConsumerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile, registrations, credits, discounts } = await getConsumerDetail(id);
  if (!profile) notFound();

  const live = registrations.filter((r) => r.status !== "cancelled");
  const spend = registrations
    .filter((r) => r.payment?.status === "paid")
    .reduce((s, r) => s + Number(r.payment?.total_amount ?? 0), 0);
  const creditTotal = credits.reduce((s, c) => s + Number(c.amount), 0);
  const activeDiscount = discounts.find((d) => d.is_active);

  return (
    <>
      <PortalHeader
        crumb="People · Consumers"
        title={profile.full_name || profile.email}
        actions={
          <ConsumerActions
            userId={profile.id}
            name={profile.full_name || profile.email}
            status={profile.status}
          />
        }
      />
      <PortalBody>
        <div className="flex flex-wrap items-center gap-3.5">
          <Avatar name={profile.full_name || profile.email} src={profile.avatar_url} size="lg" />
          <div className="min-w-0">
            <p className="text-[15px] font-extrabold">{profile.full_name || "Unnamed"}</p>
            <p className="text-[12.5px] text-ink-2">
              {profile.email}
              {profile.phone ? ` · ${profile.phone}` : ""}
            </p>
            <p className="text-[11.5px] text-ink-3">
              Joined {formatDate(profile.created_at)}
            </p>
          </div>
          <Badge
            tone={
              profile.status === "active"
                ? "success"
                : profile.status === "suspended"
                  ? "danger"
                  : "neutral"
            }
            dot
          >
            {profile.status[0].toUpperCase() + profile.status.slice(1)}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiTile label="Registrations" value={live.length} />
          <KpiTile label="Lifetime spend" value={money(spend)} />
          <KpiTile label="Account credit" value={money(creditTotal)} emphasis={creditTotal > 0} />
          <KpiTile
            label="Discount"
            value={activeDiscount ? `${activeDiscount.percent}%` : "None"}
          />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <Panel title="Registrations" subtitle={`${registrations.length} total`}>
            {registrations.length === 0 ? (
              <EmptyState title="No registrations yet" />
            ) : (
              <ul className="divide-y divide-line">
                {registrations.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <Link
                        href={r.event ? `/e/${r.event.slug}` : "#"}
                        className="block truncate text-[13.5px] font-bold"
                      >
                        {r.event?.name ?? "Event"}
                      </Link>
                      <p className="truncate text-[11px] text-ink-3">
                        Registered {formatDate(r.registered_at)}
                        {r.payment ? ` · ${r.payment.reference_code}` : ""}
                      </p>
                    </div>
                    <RegistrationStatusBadge status={r.status} dot={false} />
                    {r.payment && (
                      <>
                        <PaymentStatusBadge status={r.payment.status} dot={false} />
                        <span className="text-[12.5px] font-bold tabular-nums">
                          {money(r.payment.total_amount, r.payment.currency)}
                        </span>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Grants" subtitle="Credit and discounts">
            <div className="px-4 pb-4">
              {credits.length === 0 && discounts.length === 0 ? (
                <p className="py-3 text-[13px] text-ink-2">Nothing granted yet.</p>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {discounts.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block text-[13px] font-bold">
                          {d.percent}% off all registrations
                        </span>
                        <span className="block truncate text-[11px] text-ink-3">
                          {d.reason ?? "No reason given"} · {formatDate(d.created_at)}
                        </span>
                      </span>
                      <Badge tone={d.is_active ? "success" : "neutral"}>
                        {d.is_active ? "Active" : "Revoked"}
                      </Badge>
                    </li>
                  ))}
                  {credits.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3">
                      <span className="min-w-0">
                        <span className="block text-[13px] font-bold">
                          {money(c.amount, c.currency)} credit
                        </span>
                        <span className="block truncate text-[11px] text-ink-3">
                          {c.reason ?? "No reason given"} · {formatDate(c.created_at)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Divider className="my-3.5" />
              <p className="text-[11.5px] leading-relaxed text-ink-3">
                Credit is spent automatically at checkout. Only the most recent discount
                applies; granting a new one replaces the old.
              </p>
            </div>
          </Panel>
        </div>
      </PortalBody>
    </>
  );
}
