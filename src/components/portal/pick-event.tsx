import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { PortalHeader, PortalBody } from "@/components/portal/shell";
import { getOrganizerEvents } from "@/lib/queries/organizer";
import { EventStatusBadge } from "@/components/ui/badge";
import { Cover } from "@/components/ui/cover";
import { EmptyState } from "@/components/ui/feedback";
import { formatDate } from "@/lib/format";

/**
 * Participants, Teams, Payments and Messages are all per-event. The sidebar
 * links to them directly, so this asks which event first rather than guessing.
 */
export async function PickEvent({
  title,
  section,
}: {
  title: string;
  section: "participants" | "teams" | "payments" | "messages";
}) {
  const events = await getOrganizerEvents();
  const relevant = events.filter((e) => e.status !== "draft");

  return (
    <>
      <PortalHeader crumb="Choose an event" title={title} />
      <PortalBody>
        {relevant.length === 0 ? (
          <div className="rounded-panel border border-line">
            <EmptyState
              title="No live events yet"
              body="Once an event is approved you can manage it here."
              actionLabel="My events"
              actionHref="/organizer/events"
            />
          </div>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {relevant.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/organizer/events/${e.id}/${section}`}
                  className="flex items-center gap-3 rounded-panel border border-line px-3.5 py-3 hover:bg-soft/60"
                >
                  <Cover
                    src={e.banner_url ?? e.sport?.cover_url ?? null}
                    alt=""
                    scrim="none"
                    sizes="44px"
                    rounded="rounded-[10px]"
                    fallbackLabel={e.sport?.name?.[0]}
                    className="size-[38px] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-extrabold">{e.name}</p>
                    <p className="truncate text-[11.5px] text-ink-3">
                      {e.sport?.name} · {formatDate(e.starts_at)}
                    </p>
                  </div>
                  <EventStatusBadge status={e.status} dot={false} />
                  <ChevronRight size={16} aria-hidden className="shrink-0 text-ink-3" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PortalBody>
    </>
  );
}
