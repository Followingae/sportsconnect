import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, MapPin, Clock, Users, CalendarDays, Mail, Phone } from "lucide-react";
import { getEventBySlug, getEventCapacity } from "@/lib/queries/events";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, SITE_URL } from "@/lib/env";
import { SetupNotice } from "@/components/setup-notice";
import { Cover } from "@/components/ui/cover";
import { Card, Divider, ProgressBar } from "@/components/ui/card";
import { Tag } from "@/components/ui/chip";
import { EventStatusBadge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { ShareButton } from "@/components/consumer/share-button";
import { RegistrationGateBar } from "@/components/consumer/registration-gate";
import { gateFor, capacityOf } from "@/lib/event-state";
import { formatDate, formatDateTime, formatTime, money } from "@/lib/format";

export const revalidate = 30;

type Props = { params: Promise<{ slug: string }> };

/**
 * Real OpenGraph tags matter here — this page's whole job is to look right when
 * the link is pasted into WhatsApp.
 */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (!isSupabaseConfigured()) return { title: "Event" };
  const { slug } = await params;
  const event = await getEventBySlug(slug).catch(() => null);
  if (!event) return { title: "Event not found" };

  const cover = event.banner_url ?? event.sport?.cover_url ?? undefined;
  const when = formatDate(event.starts_at);
  const where = event.venue_name ?? "Dubai";
  const price = event.price_amount > 0 ? money(event.price_amount, event.currency) : "Free";

  return {
    title: event.name,
    description: `${event.sport?.name ?? "Sport"}${event.format ? ` · ${event.format.name}` : ""} · ${when} · ${where} · ${price}`,
    alternates: { canonical: `${SITE_URL}/e/${event.slug}` },
    openGraph: {
      title: event.name,
      description: `${when} · ${where} · ${price}`,
      url: `${SITE_URL}/e/${event.slug}`,
      images: cover ? [{ url: cover }] : undefined,
      type: "website",
    },
  };
}

export default async function EventPage({ params }: Props) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const supabase = await createClient();
  const [{ data: auth }, counts] = await Promise.all([
    supabase.auth.getUser(),
    getEventCapacity(event.id),
  ]);

  // Does the viewer already hold a place here?
  let existing = null;
  if (auth.user) {
    const { data } = await supabase
      .from("registrations")
      .select("status")
      .eq("event_id", event.id)
      .eq("user_id", auth.user.id)
      .neq("status", "cancelled")
      .maybeSingle();
    existing = data;
  }

  const cap = {
    taken: counts.taken,
    waitlisted: counts.waitlisted,
    maxParticipants: event.config?.max_participants ?? null,
    maxTeams: event.config?.max_teams ?? null,
    waitlistCapacity: event.config?.waitlist_capacity ?? 0,
  };

  const gate = gateFor(event, cap, existing);
  const { limit } = capacityOf(cap, event.registration_model);
  const unit = event.registration_model === "team" ? "teams" : "players";
  const cover = event.banner_url ?? event.sport?.cover_url ?? null;
  const shareUrl = `${SITE_URL}/e/${event.slug}`;

  return (
    <article className="pb-40">
      {/* ---------- hero ---------- */}
      <div className="relative">
        <Cover
          src={cover}
          alt=""
          scrim="full"
          priority
          sizes="(max-width: 560px) 100vw, 560px"
          rounded="rounded-none"
          fallbackLabel={event.sport?.name?.[0]}
          className="h-[260px] w-full"
        >
          <div
            className="absolute inset-x-4 flex items-center justify-between"
            style={{ top: "calc(12px + var(--safe-top))" }}
          >
            <Link
              href="/explore"
              aria-label="Back to explore"
              className="grid size-9 place-items-center rounded-full bg-ink/50 text-white backdrop-blur-sm"
            >
              <ChevronLeft size={18} aria-hidden />
            </Link>
            <ShareButton
              url={shareUrl}
              title={event.name}
              className="grid size-9 place-items-center rounded-full bg-ink/50 text-white backdrop-blur-sm"
            />
          </div>

          <div className="absolute inset-x-5 bottom-4 text-white">
            <div className="flex flex-wrap items-center gap-1.5">
              {event.sport && <Tag tone="volt">{event.sport.name}</Tag>}
              {event.format && <Tag tone="outline" className="border-white/40 text-white">{event.format.name}</Tag>}
            </div>
            <h1 className="mt-2.5 text-[26px] font-extrabold leading-[1.08] tracking-[-0.025em]">
              {event.name}
            </h1>
            {event.venue_name && (
              <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-white/85">
                <MapPin size={13} aria-hidden /> {event.venue_name}
              </p>
            )}
          </div>
        </Cover>
      </div>

      <div className="px-5">
        {/* ---------- status, when it isn't the plain open case ---------- */}
        {event.status !== "registration_open" && (
          <div className="mt-4">
            <EventStatusBadge status={event.status} />
          </div>
        )}

        {/* ---------- key facts ---------- */}
        <Card className="mt-4 flex overflow-hidden p-0">
          <Fact
            icon={<Clock size={14} />}
            label="Starts"
            value={formatDate(event.starts_at)}
            sub={formatTime(event.starts_at)}
          />
          <div className="w-px bg-line" />
          <Fact
            icon={<Users size={14} />}
            label={event.registration_model === "team" ? "Teams" : "Players"}
            value={limit ? `${counts.taken} / ${limit}` : String(counts.taken)}
            sub={limit ? `${Math.max(0, limit - counts.taken)} left` : "No limit"}
            emphasis
          />
          <div className="w-px bg-line" />
          <Fact
            icon={<CalendarDays size={14} />}
            label="Closes"
            value={event.registration_closes_at ? formatDate(event.registration_closes_at) : "—"}
            sub="registration"
          />
        </Card>

        {limit != null && (
          <div className="mt-4">
            <p className="text-[13px] font-bold tracking-[0.02em] text-ink-3">
              {counts.taken} of {limit} {unit} registered
            </p>
            <ProgressBar value={counts.taken} max={limit} className="mt-2" />
          </div>
        )}

        {/* ---------- organizer (BRD §12) ---------- */}
        <section className="mt-6">
          <h2 className="sr-only">Organizer</h2>
          <div className="flex items-center gap-3">
            <Avatar
              name={event.organization?.name ?? event.organizer?.full_name ?? "Organizer"}
              src={event.organization?.logo_url ?? event.organizer?.avatar_url}
              size="lg"
            />
            <div className="min-w-0">
              <p className="text-[11.5px] font-bold uppercase tracking-wide text-ink-3">
                Organized by
              </p>
              <p className="text-[15px] font-extrabold">
                {event.organization?.name ?? event.organizer?.full_name ?? "Sportsconnect"}
              </p>
            </div>
          </div>
        </section>

        {/* ---------- when & where ---------- */}
        <Section title="When & where">
          <DetailRow label="Starts" value={formatDateTime(event.starts_at)} />
          {event.ends_at && <DetailRow label="Ends" value={formatDateTime(event.ends_at)} />}
          {event.registration_opens_at && (
            <DetailRow
              label="Registration opens"
              value={formatDateTime(event.registration_opens_at)}
            />
          )}
          {event.registration_closes_at && (
            <DetailRow
              label="Registration closes"
              value={formatDateTime(event.registration_closes_at)}
            />
          )}
          {event.venue_name && <DetailRow label="Venue" value={event.venue_name} />}
          {event.venue_address && <DetailRow label="Address" value={event.venue_address} />}

          {(event.latitude || event.venue_address) && (
            <a
              href={
                event.latitude && event.longitude
                  ? `https://maps.google.com/?q=${event.latitude},${event.longitude}`
                  : `https://maps.google.com/?q=${encodeURIComponent(
                      `${event.venue_name ?? ""} ${event.venue_address ?? ""}`.trim()
                    )}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-2 rounded-field bg-soft px-4 py-3 text-[13px] font-semibold text-ink"
            >
              <MapPin size={15} aria-hidden />
              Open in Maps
            </a>
          )}
        </Section>

        {event.description && (
          <Section title="About this event">
            <Prose text={event.description} />
          </Section>
        )}

        {event.whats_included?.length > 0 && (
          <Section title="What's included">
            <ul className="flex flex-wrap gap-2">
              {event.whats_included.map((item: string) => (
                <li key={item}>
                  <Tag>{item}</Tag>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* ---------- pricing (BRD §15 — the breakdown must be visible) ---------- */}
        <Section title="Entry fee">
          <div className="flex items-baseline justify-between">
            <span className="text-[13.5px] text-ink-2">
              {event.price_unit === "per_team" ? "Per team" : "Per player"}
            </span>
            <span className="text-[18px] font-extrabold tabular-nums">
              {event.price_amount > 0 ? money(event.price_amount, event.currency) : "Free"}
            </span>
          </div>
          <p className="mt-2 text-[12.5px] text-ink-3">
            A platform fee and any account discount are shown before you confirm.
            Payment is by bank transfer or cash at the venue — card payments are coming
            soon.
          </p>
        </Section>

        {event.eligibility && (
          <Section title="Eligibility">
            <Prose text={event.eligibility} />
          </Section>
        )}

        {event.participant_requirements && (
          <Section title="What to bring">
            <Prose text={event.participant_requirements} />
          </Section>
        )}

        {event.rules && (
          <Section title="Rules">
            <Prose text={event.rules} />
          </Section>
        )}

        {event.cancellation_policy && (
          <Section title="Cancellation & refunds">
            <Prose text={event.cancellation_policy} />
          </Section>
        )}

        {(event.contact_email || event.contact_phone || event.organization?.contact_email) && (
          <Section title="Questions?">
            <div className="flex flex-col gap-2">
              {(event.contact_email || event.organization?.contact_email) && (
                <a
                  href={`mailto:${event.contact_email ?? event.organization?.contact_email}`}
                  className="flex items-center gap-2.5 text-[14px] font-semibold text-ink"
                >
                  <Mail size={15} aria-hidden className="text-ink-3" />
                  {event.contact_email ?? event.organization?.contact_email}
                </a>
              )}
              {(event.contact_phone || event.organization?.contact_phone) && (
                <a
                  href={`tel:${(event.contact_phone ?? event.organization?.contact_phone)?.replace(/\s/g, "")}`}
                  className="flex items-center gap-2.5 text-[14px] font-semibold text-ink"
                >
                  <Phone size={15} aria-hidden className="text-ink-3" />
                  {event.contact_phone ?? event.organization?.contact_phone}
                </a>
              )}
            </div>
          </Section>
        )}
      </div>

      <RegistrationGateBar
        gate={gate}
        slug={event.slug}
        price={event.price_amount}
        currency={event.currency}
        priceUnit={event.price_unit}
        model={event.registration_model}
      />
    </article>
  );
}

/* ---------------------------------------------------------------- helpers */

function Fact({
  icon,
  label,
  value,
  sub,
  emphasis,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  emphasis?: boolean;
}) {
  return (
    <div className="flex-1 px-2 py-3.5 text-center">
      <div className="flex items-center justify-center gap-1 text-[11.5px] font-semibold text-ink-3">
        <span aria-hidden>{icon}</span>
        {label}
      </div>
      <div className={`mt-1 text-[15px] font-bold ${emphasis ? "text-volt-deep" : ""}`}>
        {value}
      </div>
      {sub && <div className="text-[11px] text-ink-3">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="text-h3">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <>
      <div className="flex items-baseline justify-between gap-4 py-2">
        <span className="shrink-0 text-[13px] text-ink-2">{label}</span>
        <span className="text-right text-[13.5px] font-semibold">{value}</span>
      </div>
      <Divider className="last:hidden" />
    </>
  );
}

/** Renders organizer-authored plain text, preserving paragraph breaks. */
function Prose({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      {text
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="whitespace-pre-line text-[14px] leading-relaxed text-ink-2">
            {p}
          </p>
        ))}
    </div>
  );
}
