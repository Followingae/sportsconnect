import Link from "next/link";
import { Search, MapPin } from "lucide-react";
import { getHomeRails, listSports } from "@/lib/queries/events";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { SetupNotice } from "@/components/setup-notice";
import { EventRail, EventRow, type EventCardData } from "@/components/consumer/event-card";
import { Cover } from "@/components/ui/cover";
import { EmptyState } from "@/components/ui/feedback";

// Events change often enough that a short revalidate beats both static and
// fully dynamic here.
export const revalidate = 60;

export default async function HomePage() {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const supabase = await createClient();
  const [{ data: auth }, rails, sports] = await Promise.all([
    supabase.auth.getUser(),
    getHomeRails(),
    listSports(),
  ]);

  const firstName =
    (auth.user?.user_metadata?.full_name as string | undefined)?.split(" ")[0] ?? null;

  const hasAnything =
    rails.featured.length + rails.upcoming.length + rails.recentlyAdded.length > 0;

  return (
    <>
      {/* --- header ------------------------------------------------------- */}
      <header className="px-5 pt-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[13px] font-semibold text-ink-2">
              <MapPin size={13} aria-hidden /> Dubai
            </p>
            <h1 className="mt-1 text-h2">
              {firstName ? `Hi ${firstName}, find your event` : "Find your event"}
            </h1>
          </div>
          <Link
            href="/profile"
            aria-label="Your profile"
            className="grid size-11 shrink-0 place-items-center rounded-full bg-av-1 text-[15px] font-extrabold text-white"
          >
            {firstName?.[0]?.toUpperCase() ?? "S"}
          </Link>
        </div>

        <Link
          href="/explore"
          className="mt-4 flex items-center gap-2.5 rounded-field bg-soft px-4 py-[15px] text-[15px] text-ink-3"
        >
          <Search size={17} aria-hidden />
          Search events, sports or venues
        </Link>
      </header>

      {/* --- sport pills -------------------------------------------------- */}
      {sports.length > 0 && (
        <nav aria-label="Browse by sport" className="no-scrollbar mt-4 flex gap-2 overflow-x-auto px-5">
          <Link
            href="/explore"
            className="shrink-0 rounded-full bg-ink px-3.5 py-2 text-[13px] font-semibold text-white"
          >
            All
          </Link>
          {sports.map((s) => (
            <Link
              key={s.id}
              href={`/explore?sport=${s.slug}`}
              className="shrink-0 rounded-full bg-soft px-3.5 py-2 text-[13px] font-semibold text-ink hover:bg-[#e9ece7]"
            >
              {s.name}
            </Link>
          ))}
        </nav>
      )}

      {!hasAnything ? (
        <EmptyState
          className="mt-6"
          title="No events published yet"
          body="Once organizers publish their first events and a Super Admin approves them, they'll appear here."
          actionLabel="Browse sports"
          actionHref="/sports"
        />
      ) : (
        <>
          {/* --- featured --------------------------------------------------- */}
          <EventRail title="Featured" href="/explore?featured=1" events={rails.featured as EventCardData[]} />

          {/* --- closing soon ----------------------------------------------- */}
          <EventRail
            title="Registration closing soon"
            href="/explore?sort=deadline"
            events={rails.closingSoon as EventCardData[]}
          />

          {/* --- upcoming list ---------------------------------------------- */}
          {rails.upcoming.length > 0 && (
            <section className="mt-8 px-5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-h3">Upcoming events</h2>
                <Link href="/explore" className="text-[13.5px] font-bold text-volt-deep">
                  See all
                </Link>
              </div>
              <div className="mt-3.5 flex flex-col gap-3">
                {(rails.upcoming as EventCardData[]).slice(0, 5).map((e) => (
                  <EventRow key={e.id} event={e} />
                ))}
              </div>
            </section>
          )}

          {/* --- popular sports --------------------------------------------- */}
          {sports.length > 0 && (
            <section className="mt-9 px-5">
              <h2 className="text-h3">Browse sports</h2>
              <p className="mt-1 text-meta text-ink-2">Pick a sport to see events near you.</p>
              <div className="mt-3.5 grid grid-cols-2 gap-3">
                {sports.map((s, i) => (
                  <Link
                    key={s.id}
                    href={`/explore?sport=${s.slug}`}
                    className={i === sports.length - 1 && sports.length % 2 === 1 ? "col-span-2" : undefined}
                  >
                    <Cover
                      src={s.cover_url}
                      alt=""
                      scrim="soft"
                      sizes="(max-width: 560px) 50vw, 280px"
                      fallbackLabel={s.name[0]}
                      className="h-[110px] w-full"
                    >
                      <div className="absolute inset-x-3.5 bottom-3 text-white">
                        <div className="text-[16px] font-extrabold">{s.name}</div>
                      </div>
                    </Cover>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* --- recently added --------------------------------------------- */}
          <EventRail
            title="Recently added"
            href="/explore?sort=recent"
            events={rails.recentlyAdded as EventCardData[]}
          />
        </>
      )}

      {/* --- venues teaser (BRD gates venue accounts) ---------------------- */}
      <section className="mx-5 mt-9 rounded-card-lg bg-ink p-5 text-white">
        <span className="inline-flex rounded-full bg-volt-wash px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-volt-deep">
          Coming soon
        </span>
        <h2 className="mt-3 text-[18px] font-extrabold tracking-[-0.02em]">
          Run a venue? Bring your courts online.
        </h2>
        <p className="mt-2 max-w-[36ch] text-[13px] leading-relaxed text-ink-inverse">
          Venue accounts aren&apos;t live yet. Register your interest and we&apos;ll get you
          set up first.
        </p>
        <Link
          href="/venues"
          className="mt-4 inline-flex rounded-[12px] bg-volt px-4 py-2.5 text-[14px] font-bold text-ink"
        >
          Notify me
        </Link>
      </section>
    </>
  );
}
