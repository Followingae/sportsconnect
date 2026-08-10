import Link from "next/link";
import { Cover } from "@/components/ui/cover";
import { Tag } from "@/components/ui/chip";
import { EventStatusBadge } from "@/components/ui/badge";
import { money, formatWhen, formatDate } from "@/lib/format";
import { cn } from "@/lib/cn";

/** The shape both card variants need — matches CARD_FIELDS in queries/events. */
export type EventCardData = {
  id: string;
  slug: string;
  name: string;
  banner_url: string | null;
  starts_at: string;
  registration_closes_at: string | null;
  price_amount: number;
  currency: string;
  price_unit: string;
  status: Parameters<typeof EventStatusBadge>[0]["status"];
  venue_name: string | null;
  sport: { slug: string; name: string; cover_url: string | null } | null;
  format: { name: string } | null;
};

const coverFor = (e: EventCardData) => e.banner_url ?? e.sport?.cover_url ?? null;
const priceLabel = (e: EventCardData) =>
  e.price_amount > 0
    ? `${money(e.price_amount, e.currency)}${e.price_unit === "per_team" ? " / team" : ""}`
    : "Free";

/** Large photo-led card. Used for featured and the top of a rail. */
export function EventHeroCard({
  event,
  className,
  priority,
}: {
  event: EventCardData;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/e/${event.slug}`}
      className={cn("block focus-visible:outline-offset-4", className)}
    >
      <Cover
        src={coverFor(event)}
        alt=""
        scrim="bottom"
        priority={priority}
        sizes="(max-width: 560px) 100vw, 560px"
        rounded="rounded-card-lg"
        fallbackLabel={event.sport?.name?.[0]}
        className="aspect-[16/11] w-full"
      >
        <div className="absolute right-3.5 top-3.5">
          <span className="rounded-full bg-white/92 px-2.5 py-1 text-[12px] font-bold text-ink">
            {formatWhen(event.starts_at)}
          </span>
        </div>
        <div className="absolute inset-x-4 bottom-4 text-white">
          <div className="flex flex-wrap items-center gap-1.5">
            {event.sport && <Tag tone="volt">{event.sport.name}</Tag>}
            {event.format && (
              <span className="text-[12px] font-semibold text-white/85">
                {event.format.name}
              </span>
            )}
          </div>
          <h3 className="mt-2 text-[20px] font-extrabold leading-tight tracking-[-0.02em]">
            {event.name}
          </h3>
          <div className="mt-2.5 flex items-end justify-between gap-3">
            <p className="min-w-0 truncate text-[12.5px] text-white/85">
              {event.venue_name ?? "Venue to be confirmed"}
            </p>
            <span className="shrink-0 rounded-[12px] bg-volt px-3 py-2 text-[14px] font-extrabold text-ink">
              {priceLabel(event)}
            </span>
          </div>
        </div>
      </Cover>
    </Link>
  );
}

/** Compact list row. Used in Explore and search results. */
export function EventRow({ event }: { event: EventCardData }) {
  return (
    <Link
      href={`/e/${event.slug}`}
      className="flex items-center gap-3.5 rounded-card border border-line bg-white p-3 transition-colors hover:bg-soft/60"
    >
      <Cover
        src={coverFor(event)}
        alt=""
        scrim="none"
        sizes="80px"
        rounded="rounded-[15px]"
        fallbackLabel={event.sport?.name?.[0]}
        className="size-[70px] shrink-0"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          {event.sport && <Tag tone="volt">{event.sport.name}</Tag>}
          {event.format && <Tag>{event.format.name}</Tag>}
        </div>
        <h3 className="mt-1.5 truncate text-[16px] font-extrabold tracking-[-0.01em]">
          {event.name}
        </h3>
        <p className="mt-0.5 truncate text-[12.5px] text-ink-2">
          {formatWhen(event.starts_at)}
          {event.venue_name ? ` · ${event.venue_name}` : ""}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-[14px] font-extrabold tabular-nums">{priceLabel(event)}</div>
        {event.status !== "registration_open" && (
          <div className="mt-1">
            <EventStatusBadge status={event.status} dot={false} />
          </div>
        )}
        {event.status === "registration_open" && event.registration_closes_at && (
          <div className="mt-1 text-[11px] text-ink-3">
            Closes {formatDate(event.registration_closes_at)}
          </div>
        )}
      </div>
    </Link>
  );
}

/**
 * A rail on a phone, a grid on a desktop. Horizontal scrolling is the right
 * gesture on touch and the wrong one with a mouse, so it stops at `lg`.
 */
export function EventRail({
  title,
  href,
  events,
  emptyLabel,
}: {
  title: string;
  href?: string;
  events: EventCardData[];
  emptyLabel?: string;
}) {
  if (events.length === 0 && !emptyLabel) return null;

  return (
    <section className="mt-7 lg:mt-12">
      <div className="flex items-baseline justify-between gap-3 px-5 lg:px-0">
        <h2 className="text-h3 lg:text-[24px] lg:tracking-[-0.02em]">{title}</h2>
        {href && events.length > 0 && (
          <Link href={href} className="text-[13.5px] font-bold text-volt-deep">
            See all
          </Link>
        )}
      </div>

      {events.length === 0 ? (
        <p className="mt-2 px-5 text-[13.5px] text-ink-2 lg:px-0">{emptyLabel}</p>
      ) : (
        <div
          className={cn(
            "no-scrollbar mt-3.5 flex gap-3 overflow-x-auto px-5 pb-1",
            "lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible lg:px-0"
          )}
        >
          {events.map((e) => (
            <div key={e.id} className="w-[280px] shrink-0 lg:w-auto">
              <EventHeroCard event={e} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
