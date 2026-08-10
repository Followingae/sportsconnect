import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, MapPin, Shapes, Target } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { listSports } from "@/lib/queries/events";
import { PUBLIC_EVENT_STATUSES } from "@/lib/status";
import { pluralize } from "@/lib/format";

export const revalidate = 300;

export const metadata: Metadata = {
  // Absolute title, so the root "%s · Sportsconnect" template doesn't repeat
  // the brand twice on the homepage.
  title: {
    absolute: "Sportsconnect | Book courts and join games in Dubai",
  },
  description:
    "Football, padel, cricket, badminton and basketball across Dubai. Browse live events, register solo or as a team, and pay by bank transfer or cash at the venue.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Sportsconnect | Game on, anytime",
    description:
      "Book courts and join games in seconds. Five sports, one platform, live in Dubai.",
    url: "/",
    images: [
      {
        url: "/covers/padel.webp",
        width: 1600,
        height: 900,
        alt: "Padel players mid-rally on a glass court in Dubai",
      },
    ],
  },
};

/** Everything on this page is real: sports, venues and counts all come from the DB. */
async function getLandingData() {
  if (!isSupabaseConfigured()) {
    return { sports: [], venues: [], liveEvents: 0, openNow: 0 };
  }

  const supabase = await createClient();
  const [sports, eventsRes, openRes] = await Promise.all([
    listSports(),
    supabase
      .from("events")
      .select("venue_name, venue_address, banner_url, sport:sports ( name, cover_url )")
      .in("status", PUBLIC_EVENT_STATUSES)
      .not("venue_name", "is", null)
      .order("starts_at", { ascending: true })
      .limit(40),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .eq("status", "registration_open"),
  ]);

  // Collapse events down to distinct venues, keeping the first cover we see.
  const seen = new Map<
    string,
    { name: string; sport: string; cover: string | null; area: string | null }
  >();
  for (const e of eventsRes.data ?? []) {
    if (!e.venue_name || seen.has(e.venue_name)) continue;
    seen.set(e.venue_name, {
      name: e.venue_name,
      sport: e.sport?.name ?? "",
      cover: e.banner_url ?? e.sport?.cover_url ?? null,
      area: e.venue_address?.split(",")[0]?.trim() ?? null,
    });
  }

  return {
    sports,
    venues: [...seen.values()].slice(0, 3),
    liveEvents: eventsRes.data?.length ?? 0,
    openNow: openRes.count ?? 0,
  };
}

export default async function LandingPage() {
  const { sports, venues, openNow } = await getLandingData();
  const sportNames = sports.length
    ? sports.map((s) => s.name)
    : ["Football", "Padel", "Cricket", "Badminton", "Basketball"];

  return (
    <>
      {/* ================= top bar ================= */}
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-5 pb-2 pt-[22px]">
        <Link href="/" className="inline-flex items-baseline text-[22px] font-extrabold tracking-[-0.03em]">
          sports<span className="text-volt">connect</span>
        </Link>

        <nav aria-label="Sections" className="hidden gap-[26px] md:flex">
          {[
            ["#sports", "Sports"],
            ["#venues", "Venues"],
            ["#how", "How it works"],
            ["#organizers", "For organizers"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              className="text-[14px] font-semibold text-muted transition-colors hover:text-cream"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden text-[14px] font-bold md:inline">
            Log in
          </Link>
          <Link
            href="/home"
            className="btn-clip inline-flex items-center gap-2 rounded-[12px] bg-volt px-[18px] py-[11px] text-[14px] font-extrabold text-ink"
          >
            Open app
          </Link>
        </div>
      </div>

      {/* ================= hero ================= */}
      <section className="mx-auto max-w-[1200px] px-5 pb-5 pt-[26px]">
        <div className="grid items-center gap-5 md:grid-cols-[1.05fr_0.95fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-volt/15 px-3.5 py-[7px] text-[12.5px] font-bold uppercase tracking-[0.06em] text-volt">
              <span aria-hidden>●</span> Now live in Dubai
            </span>

            <h1 className="disp mt-5 text-[clamp(46px,11vw,84px)]">
              Game On
              <br />
              Anytime
            </h1>

            <p className="mt-5 max-w-[380px] text-[17px] leading-[1.55] text-muted">
              Book courts and join games in seconds.
              {openNow > 0 && (
                <>
                  {" "}
                  <span className="font-bold text-cream">
                    {pluralize(openNow, "event")} open right now.
                  </span>
                </>
              )}
            </p>

            {/* Real search — submits straight into /explore with the filters applied. */}
            <form action="/explore" className="mt-[26px] flex flex-col gap-2.5">
              <div className="grid gap-px overflow-hidden rounded-[14px] bg-white/12 sm:grid-cols-3">
                <label className="bg-navy-2 px-4 py-3.5">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-volt">
                    <Shapes size={12} aria-hidden /> Activity
                  </span>
                  <select
                    name="sort"
                    className="mt-1 w-full cursor-pointer bg-transparent text-[14.5px] font-bold text-cream outline-none"
                  >
                    <option value="date" className="text-ink">Play or compete</option>
                    <option value="deadline" className="text-ink">Closing soon</option>
                    <option value="recent" className="text-ink">Recently added</option>
                  </select>
                </label>

                <label className="bg-navy-2 px-4 py-3.5">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-volt">
                    <MapPin size={12} aria-hidden /> Location
                  </span>
                  <input
                    name="q"
                    placeholder="Where to play?"
                    className="mt-1 w-full bg-transparent text-[14.5px] font-bold text-cream outline-none placeholder:text-muted"
                  />
                </label>

                <label className="bg-navy-2 px-4 py-3.5">
                  <span className="flex items-center gap-1.5 text-[11px] font-bold text-volt">
                    <Target size={12} aria-hidden /> Sport
                  </span>
                  <select
                    name="sport"
                    className="mt-1 w-full cursor-pointer bg-transparent text-[14.5px] font-bold text-cream outline-none"
                  >
                    <option value="" className="text-ink">Any sport</option>
                    {sports.map((s) => (
                      <option key={s.slug} value={s.slug} className="text-ink">
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button
                type="submit"
                className="btn-clip inline-flex items-center justify-center gap-2 rounded-[12px] bg-volt p-4 text-[15px] font-extrabold text-ink"
              >
                Find games <ArrowRight size={16} aria-hidden />
              </button>
            </form>
          </div>

          <div className="relative">
            <div className="relative h-[clamp(300px,60vw,460px)] overflow-hidden rounded-[22px] bg-navy-2">
              <Image
                src="/covers/padel.webp"
                alt="Padel players mid-rally on a glass court"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 560px"
                className="object-cover"
              />
            </div>
            <Link
              href="/explore"
              className="absolute bottom-3.5 right-3.5 max-w-[190px] rounded-[16px] bg-volt px-4 py-3.5 text-ink"
            >
              <span className="disp block text-[17px] leading-none">Live now</span>
              <span className="mt-1.5 block text-[12.5px] font-semibold">
                See what&apos;s on near you today
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ================= sports marquee ================= */}
      <section
        id="sports"
        className="marquee mt-4 overflow-hidden border-y border-white/12 py-[22px]"
      >
        <h2 className="sr-only">Sports we cover</h2>
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <div
              key={copy}
              aria-hidden={copy === 1}
              className="disp flex items-center gap-[26px] pr-[26px] text-[clamp(30px,6vw,52px)]"
            >
              {sportNames.map((name) => (
                <span key={name} className="flex items-center gap-[26px]">
                  <span>{name}</span>
                  <span className="text-volt" aria-hidden>
                    ✕
                  </span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ================= how it works ================= */}
      <section id="how" className="mx-auto max-w-[1200px] px-5 pb-5 pt-[60px]">
        <div className="grid items-center gap-5 md:grid-cols-2">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted">
              How it works
            </p>
            <h2 className="disp mt-3.5 text-[clamp(34px,7vw,52px)]">
              Find Your
              <br />
              Game Anytime
            </h2>

            <ol className="mt-6 flex max-w-[440px] flex-col gap-3.5">
              {[
                ["Browse & filter", "By sport, date, price, skill and more."],
                ["Register, solo or team", "Name your squad and invite your players."],
                ["Pay & play", "Bank transfer or cash at the venue."],
              ].map(([title, body], i) => (
                <li key={title} className="flex items-center gap-3.5">
                  <span className="grid size-[34px] shrink-0 place-items-center rounded-[10px] bg-volt text-[15px] font-black text-ink">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block text-[16px] font-extrabold">{title}</span>
                    <span className="block text-[13.5px] text-muted">{body}</span>
                  </span>
                </li>
              ))}
            </ol>

            <Link
              href="/explore"
              className="btn-clip mt-[26px] inline-flex items-center gap-2 rounded-[12px] bg-volt px-[22px] py-3.5 text-[15px] font-extrabold text-ink"
            >
              Browse events <ArrowRight size={16} aria-hidden />
            </Link>
          </div>

          <div className="relative">
            <div className="relative h-[clamp(320px,64vw,440px)] overflow-hidden rounded-[22px] bg-navy-2">
              <Image
                src="/covers/basketball.webp"
                alt="Basketball at the rim under floodlights"
                fill
                sizes="(max-width: 768px) 100vw, 560px"
                className="object-cover"
              />
            </div>
            <div className="absolute -bottom-3.5 -left-1.5 size-24 overflow-hidden rounded-[16px] border-4 border-navy bg-navy-2">
              <Image
                src="/covers/football.webp"
                alt=""
                fill
                sizes="96px"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ================= venues ================= */}
      <section id="venues" className="mx-auto max-w-[1200px] px-5 pb-5 pt-16">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-muted">
              Explore
            </p>
            <h2 className="disp mt-3 text-[clamp(32px,6.5vw,50px)]">
              Popular
              <br />
              Sports Venues
            </h2>
          </div>
          <Link
            href="/explore"
            className="inline-flex items-center gap-2 rounded-[12px] border-[1.5px] border-white/12 px-5 py-3 text-[15px] font-bold"
          >
            View all
          </Link>
        </div>

        <p className="mt-4 max-w-[440px] text-[16px] leading-[1.6] text-muted">
          {venues.length > 0
            ? "Where games are happening right now."
            : "Venues appear here as organizers publish their events."}
        </p>

        {venues.length > 0 && (
          <ul className="mt-[26px] grid gap-5 md:grid-cols-3">
            {venues.map((v) => (
              <li key={v.name}>
                <Link
                  href={`/explore?q=${encodeURIComponent(v.name)}`}
                  className="relative block h-[200px] overflow-hidden rounded-[18px] bg-navy-2"
                >
                  {v.cover && (
                    <Image
                      src={v.cover}
                      alt=""
                      fill
                      sizes="(max-width: 768px) 100vw, 380px"
                      className="object-cover"
                    />
                  )}
                  <span
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-b from-transparent from-40% to-navy/90"
                  />
                  <span className="absolute inset-x-4 bottom-4">
                    <span className="disp block text-[20px]">{v.name}</span>
                    <span className="mt-1 block text-[13px] text-muted">
                      {[v.sport, v.area].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ================= stats ================= */}
      <section className="mx-auto max-w-[1200px] px-5 pt-14">
        <h2 className="sr-only">Why Sportsconnect</h2>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[18px] bg-white/12">
          {[
            [`${sportNames.length} Sports`, "Football to basketball"],
            ["No app", "Runs in your browser"],
            ["Team or solo", "Register either way"],
            ["Pay your way", "Transfer or cash"],
          ].map(([big, small]) => (
            <div key={big} className="bg-navy-2 px-[18px] py-6 text-center">
              <dt className="disp text-[30px] text-volt">{big}</dt>
              <dd className="mt-1 text-[13px] text-muted">{small}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ================= organizers ================= */}
      <section id="organizers" className="mx-auto max-w-[1200px] px-5 pt-14">
        <div className="grid gap-[22px] rounded-[24px] bg-navy-card p-[clamp(28px,5vw,48px)]">
          <div>
            <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-volt">
              For clubs &amp; organizers
            </p>
            <h2 className="disp mt-3 text-[clamp(28px,5.5vw,42px)]">
              Run your event on Sportsconnect
            </h2>
            <p className="mt-3.5 max-w-[520px] text-[16px] leading-[1.6] text-muted">
              Build events, manage teams and squads, message your participants and track
              every payment — all in one portal.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/organizer"
              className="btn-clip inline-flex items-center gap-2 rounded-[12px] bg-volt px-[22px] py-3.5 text-[15px] font-extrabold text-ink"
            >
              Become an organizer <ArrowRight size={16} aria-hidden />
            </Link>
            <a
              href="mailto:hello@sportsconnect.ae?subject=Organizer%20account"
              className="inline-flex items-center gap-2 rounded-[12px] border-[1.5px] border-white/12 px-5 py-3 text-[15px] font-bold"
            >
              Talk to us
            </a>
          </div>
        </div>
      </section>

      {/* ================= join us ================= */}
      <section className="marquee mt-14 overflow-hidden border-t border-white/12 py-[26px]">
        <Link href="/signup" className="block">
          <span className="sr-only">Create your account</span>
          <div className="marquee-track slow">
            {[0, 1].map((copy) => (
              <div
                key={copy}
                aria-hidden={copy === 1}
                className="disp flex items-center gap-[26px] pr-[26px] text-[clamp(40px,9vw,72px)]"
              >
                {[0, 1, 2].map((i) => (
                  <span key={i} className="flex items-center gap-[26px]">
                    <span>Join Us</span>
                    <span className="text-volt" aria-hidden>
                      ✕
                    </span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </Link>
      </section>

      {/* ================= footer ================= */}
      <footer className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 pb-11 pt-5">
        <span className="inline-flex items-baseline text-[19px] font-extrabold tracking-[-0.03em]">
          sports<span className="text-volt">connect</span>
        </span>
        <p className="text-[13px] text-muted">© 2026 Sportsconnect · Dubai, UAE</p>
        <nav aria-label="Legal" className="flex gap-[18px] text-[13px] font-semibold text-muted">
          <Link href="/legal/privacy" className="hover:text-cream">
            Privacy
          </Link>
          <Link href="/legal/terms" className="hover:text-cream">
            Terms
          </Link>
          <a href="mailto:hello@sportsconnect.ae" className="hover:text-cream">
            Contact
          </a>
        </nav>
      </footer>
    </>
  );
}
