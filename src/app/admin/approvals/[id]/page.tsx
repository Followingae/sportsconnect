import { notFound } from "next/navigation";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { PortalHeader, PortalBody } from "@/components/portal/shell";
import { getEventForReview } from "@/lib/queries/admin";
import { validateForSubmission } from "@/lib/event-validation";
import { Panel, Divider } from "@/components/ui/card";
import { EventStatusBadge } from "@/components/ui/badge";
import { Tag } from "@/components/ui/chip";
import { Cover } from "@/components/ui/cover";
import { ReviewDecision } from "@/components/portal/review-decision";
import { money, formatDateTime } from "@/lib/format";

export const metadata = { title: "Review event" };

export default async function ReviewEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEventForReview(id);
  if (!event) notFound();

  const problems = validateForSubmission(event);
  const capacity =
    event.registration_model === "team"
      ? event.config?.max_teams
      : event.config?.max_participants;

  const checks = [
    { ok: problems.length === 0, label: "All required fields complete" },
    { ok: Boolean(event.venue_name && event.starts_at), label: "Venue and dates set" },
    { ok: Boolean(event.banner_url), label: "Banner image provided" },
    { ok: Boolean(event.cancellation_policy), label: "Cancellation policy provided" },
    { ok: Boolean(capacity), label: "Capacity set" },
  ];

  return (
    <>
      <PortalHeader
        crumb="Approvals"
        title="Review event"
        actions={<EventStatusBadge status={event.status} />}
      />
      <PortalBody>
        <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr] lg:items-start">
          <Panel className="overflow-hidden">
            <Cover
              src={event.banner_url ?? event.sport?.cover_url ?? null}
              alt=""
              scrim="bottom"
              sizes="(max-width: 1024px) 100vw, 640px"
              rounded="rounded-none"
              fallbackLabel={event.sport?.name?.[0]}
              className="h-[140px] w-full"
            >
              <div className="absolute inset-x-4 bottom-3 text-white">
                <p className="text-[18px] font-extrabold">{event.name}</p>
                <p className="text-[12px] opacity-90">
                  {event.sport?.name} · {event.format?.name} · by{" "}
                  {event.organization?.name ?? event.organizer?.full_name}
                </p>
              </div>
            </Cover>

            <div className="grid gap-3.5 p-4 md:grid-cols-3">
              <Fact label="Date" value={formatDateTime(event.starts_at)} />
              <Fact label="Venue" value={event.venue_name ?? "—"} />
              <Fact
                label="Entry fee"
                value={`${money(event.price_amount, event.currency)} ${
                  event.price_unit === "per_team" ? "/ team" : "/ player"
                }`}
              />
              <Fact
                label="Capacity"
                value={
                  capacity
                    ? `${capacity} ${event.registration_model === "team" ? "teams" : "players"}`
                    : "Not set"
                }
              />
              <Fact label="Format" value={event.format?.name ?? "—"} />
              <Fact
                label="Registration"
                value={
                  event.registration_opens_at
                    ? `Opens ${formatDateTime(event.registration_opens_at)}`
                    : "Not set"
                }
              />
            </div>

            <div className="px-4 pb-4">
              {event.description && (
                <Block title="Description" body={event.description} />
              )}
              {event.rules && <Block title="Rules" body={event.rules} />}
              {event.eligibility && <Block title="Eligibility" body={event.eligibility} />}
              {event.cancellation_policy && (
                <Block title="Cancellation & refunds" body={event.cancellation_policy} />
              )}
              {event.whats_included?.length > 0 && (
                <>
                  <p className="mt-3.5 text-[11.5px] font-bold uppercase tracking-wide text-ink-3">
                    What&apos;s included
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {event.whats_included.map((i: string) => (
                      <Tag key={i}>{i}</Tag>
                    ))}
                  </div>
                </>
              )}
            </div>
          </Panel>

          <Panel title="Decision" className="lg:sticky lg:top-4">
            <div className="px-4 pb-4">
              <ul className="flex flex-col gap-2">
                {checks.map((c) => (
                  <li key={c.label} className="flex items-start gap-2 text-[13px]">
                    <span className={c.ok ? "text-success" : "text-warning"}>
                      {c.ok ? (
                        <CheckCircle2 size={14} aria-hidden />
                      ) : (
                        <AlertCircle size={14} aria-hidden />
                      )}
                    </span>
                    <span className={c.ok ? "text-ink-2" : "text-ink"}>{c.label}</span>
                  </li>
                ))}
              </ul>

              {problems.length > 0 && (
                <ul className="mt-3 rounded-[10px] bg-warning-wash p-3 text-[12px] text-warning">
                  {problems.slice(0, 4).map((p, i) => (
                    <li key={i}>· {p.message}</li>
                  ))}
                </ul>
              )}

              <Divider className="my-3.5" />

              <ReviewDecision eventId={event.id} blocked={problems.length > 0} />
            </div>
          </Panel>
        </div>
      </PortalBody>
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-ink-3">{label}</p>
      <p className="mt-0.5 text-[13.5px] font-bold">{value}</p>
    </div>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div className="mt-3.5">
      <p className="text-[11.5px] font-bold uppercase tracking-wide text-ink-3">{title}</p>
      <p className="mt-1 whitespace-pre-line text-[13px] leading-relaxed text-ink-2">
        {body}
      </p>
    </div>
  );
}
