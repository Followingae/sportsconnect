import { validateForSubmission } from "@/lib/event-validation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle, ExternalLink, Users, Wallet, Shield, Mail } from "lucide-react";
import { PortalBody } from "@/components/portal/shell";
import {
  getOrganizerEvent,
  getEventParticipants,
  getEventPayments,
} from "@/lib/queries/organizer";
import { KpiTile, Panel, ProgressBar, Divider } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { SubmitEventButton, CancelEventButton } from "@/components/portal/event-actions";
import { money, formatDateTime } from "@/lib/format";

export const metadata = { title: "Event" };

export default async function EventOverview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getOrganizerEvent(id);
  if (!event) notFound();

  const [participants, payments] = await Promise.all([
    getEventParticipants(id),
    getEventPayments(id),
  ]);

  const live = participants.filter((p) => p.status !== "cancelled");
  const confirmed = live.filter((p) => p.status === "confirmed").length;
  const waitlisted = live.filter((p) => p.status === "waitlisted").length;
  const limit = event.config?.max_teams ?? event.config?.max_participants ?? null;

  const expected = payments
    .filter((p) => ["pending", "processing", "paid"].includes(p.status))
    .reduce((s, p) => s + Number(p.total_amount), 0);
  const collected = payments
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.total_amount), 0);
  const unpaid = payments.filter((p) => ["pending", "processing"].includes(p.status));

  const problems = validateForSubmission(event);
  const canSubmit = ["draft", "changes_requested", "rejected"].includes(event.status);

  return (
    <PortalBody>
      {event.status === "changes_requested" && event.review_note && (
        <div className="mb-4 rounded-panel border border-warning-wash bg-warning-wash p-4">
          <p className="flex items-center gap-2 text-[13px] font-bold text-warning">
            <AlertCircle size={15} aria-hidden />
            Changes requested by the Super Admin
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{event.review_note}</p>
          <ButtonLink href={`/organizer/events/${id}/edit`} size="sm" className="mt-3">
            Make the changes
          </ButtonLink>
        </div>
      )}

      {event.status === "rejected" && (
        <div className="mb-4 rounded-panel border border-danger-wash bg-danger-wash p-4">
          <p className="text-[13px] font-bold text-danger">This event was rejected</p>
          {event.review_note && (
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink-2">{event.review_note}</p>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile
          label={event.registration_model === "team" ? "Teams" : "Participants"}
          value={limit ? `${live.length} / ${limit}` : live.length}
          hint={`${confirmed} confirmed`}
        />
        <KpiTile label="Waitlisted" value={waitlisted} />
        <KpiTile
          label="Unpaid"
          value={unpaid.length}
          hint={money(unpaid.reduce((s, p) => s + Number(p.total_amount), 0), event.currency)}
        />
        <KpiTile
          label="Expected collection"
          value={money(expected, event.currency)}
          hint={`${money(collected, event.currency)} reconciled`}
          emphasis
        />
      </div>

      {limit != null && (
        <div className="mt-4">
          <ProgressBar value={live.length} max={limit} showLabel />
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Manage">
          <div className="grid grid-cols-2 gap-2.5 p-4 pt-0">
            <HubLink
              href={`/organizer/events/${id}/participants`}
              icon={<Users size={16} />}
              label="Participants"
              meta={`${live.length}`}
            />
            <HubLink
              href={`/organizer/events/${id}/teams`}
              icon={<Shield size={16} />}
              label="Teams"
            />
            <HubLink
              href={`/organizer/events/${id}/payments`}
              icon={<Wallet size={16} />}
              label="Payments"
              meta={`${unpaid.length} unpaid`}
            />
            <HubLink
              href={`/organizer/events/${id}/messages`}
              icon={<Mail size={16} />}
              label="Messages"
            />
          </div>
        </Panel>

        <Panel title="Details">
          <div className="px-4 pb-4">
            <Row label="Sport" value={`${event.sport?.name} · ${event.format?.name ?? "—"}`} />
            <Row label="Starts" value={formatDateTime(event.starts_at)} />
            <Row
              label="Registration"
              value={
                event.registration_opens_at
                  ? `${formatDateTime(event.registration_opens_at)} → ${
                      event.registration_closes_at
                        ? formatDateTime(event.registration_closes_at)
                        : "—"
                    }`
                  : "Not set"
              }
            />
            <Row label="Venue" value={event.venue_name ?? "Not set"} />
            <Row
              label="Entry fee"
              value={`${money(event.price_amount, event.currency)} ${
                event.price_unit === "per_team" ? "per team" : "per player"
              }`}
            />

            <Divider className="my-3" />

            <div className="flex flex-wrap gap-2">
              {["published", "registration_open", "registration_closed", "sold_out", "completed"].includes(
                event.status
              ) && (
                <ButtonLink
                  href={`/e/${event.slug}`}
                  variant="ghost"
                  size="sm"
                  icon={<ExternalLink size={13} />}
                >
                  View public page
                </ButtonLink>
              )}
              <ButtonLink href={`/organizer/events/${id}/edit`} variant="ghost" size="sm">
                Edit
              </ButtonLink>
              {canSubmit && (
                <SubmitEventButton eventId={id} disabled={problems.length > 0} />
              )}
              {!["cancelled", "completed", "archived"].includes(event.status) && (
                <CancelEventButton eventId={id} eventName={event.name} />
              )}
            </div>

            {canSubmit && problems.length > 0 && (
              <p className="mt-3 text-[12px] text-warning">
                {problems.length} required field(s) still missing —{" "}
                <Link
                  href={`/organizer/events/${id}/edit`}
                  className="font-bold underline underline-offset-2"
                >
                  finish the builder
                </Link>
                .
              </p>
            )}
          </div>
        </Panel>
      </div>
    </PortalBody>
  );
}

function HubLink({
  href,
  icon,
  label,
  meta,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  meta?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2.5 rounded-[12px] border border-line px-3.5 py-3 hover:bg-soft/60"
    >
      <span className="text-ink-3">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-bold">{label}</span>
        {meta && <span className="block text-[11px] text-ink-3">{meta}</span>}
      </span>
    </Link>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-[13px]">
      <span className="shrink-0 text-ink-2">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}
