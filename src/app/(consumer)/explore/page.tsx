import Link from "next/link";
import { Search as SearchIcon } from "lucide-react";
import { listEvents, type EventFilters } from "@/lib/queries/events";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { SetupNotice } from "@/components/setup-notice";
import { ExploreFilters } from "@/components/consumer/explore-filters";
import { EventRow, type EventCardData } from "@/components/consumer/event-card";
import { EmptyState } from "@/components/ui/feedback";
import { pluralize } from "@/lib/format";
import type { Enums } from "@/lib/database.types";

export const metadata = { title: "Explore events" };
export const dynamic = "force-dynamic";

/** Turn the URL's date preset into a concrete range. */
function dateRange(preset?: string) {
  if (!preset) return {};
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (preset === "today") end.setHours(23, 59, 59, 999);
  else if (preset === "week") end.setDate(end.getDate() + 7);
  else if (preset === "month") end.setMonth(end.getMonth() + 1);
  else return {};

  return { dateFrom: start.toISOString(), dateTo: end.toISOString() };
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;

  const filters: EventFilters = {
    sport: sp.sport,
    format: sp.format,
    query: sp.q,
    organizer: sp.organizer,
    skill: sp.skill,
    gender: sp.gender as Enums<"gender_requirement"> | undefined,
    priceMax: sp.priceMax ? Number(sp.priceMax) : undefined,
    sort: (sp.sort as EventFilters["sort"]) ?? "date",
    page,
    perPage: 20,
    ...dateRange(sp.date),
  };

  const supabase = await createClient();
  const [{ events, total }, sportsRes, formatsRes, orgsRes] = await Promise.all([
    listEvents(filters),
    supabase.from("sports").select("slug, name").eq("is_active", true).order("sort_order"),
    supabase
      .from("sport_formats")
      .select("slug, name, sport:sports!inner ( slug )")
      .eq("is_active", true)
      .order("sort_order"),
    supabase.from("organizations").select("id, name").order("name"),
  ]);

  // "Has places" needs live counts, so it filters the fetched page rather than
  // the query — capacity lives in registrations, not on the event row.
  let visible = events as unknown as EventCardData[];
  if (sp.available === "1") {
    const ids = visible.map((e) => e.id);
    if (ids.length) {
      const { data: taken } = await supabase
        .from("registrations")
        .select("event_id")
        .in("event_id", ids)
        .in("status", ["confirmed", "pending"]);

      const counts = new Map<string, number>();
      for (const r of taken ?? []) {
        counts.set(r.event_id, (counts.get(r.event_id) ?? 0) + 1);
      }
      visible = visible.filter((e) => {
        const cfg = (e as unknown as { config?: { max_participants: number | null; max_teams: number | null } }).config;
        const limit = cfg?.max_teams ?? cfg?.max_participants ?? null;
        return limit == null || (counts.get(e.id) ?? 0) < limit;
      });
    }
  }

  const pageCount = Math.max(1, Math.ceil(total / 20));
  const pageHref = (n: number) => {
    const q = new URLSearchParams(
      Object.entries(sp).filter(([, v]) => v) as [string, string][]
    );
    q.set("page", String(n));
    return `/explore?${q.toString()}`;
  };

  return (
    <div>
      <header className="px-5 pt-4 lg:px-0 lg:pt-0">
        <h1 className="text-h2 lg:text-[36px] lg:tracking-[-0.03em]">Explore</h1>
      </header>

      <div className="mt-4">
        <ExploreFilters
          options={{
            sports: sportsRes.data ?? [],
            formats: (formatsRes.data ?? []).map((f) => ({
              slug: f.slug,
              name: f.name,
              sport_slug: f.sport?.slug ?? "",
            })),
            organizers: orgsRes.data ?? [],
          }}
        />
      </div>

      <p className="mt-4 px-5 text-[13px] text-ink-3 lg:px-0" aria-live="polite">
        {pluralize(total, "event")} found
      </p>

      {visible.length === 0 ? (
        <EmptyState
          className="mt-2"
          icon={<SearchIcon size={22} />}
          title="Nothing matches those filters"
          body="Try widening the date range, clearing the price cap, or picking a different sport."
          actionLabel="Clear filters"
          actionHref="/explore"
        />
      ) : (
        <div className="mt-3 flex flex-col gap-3 px-5 lg:grid lg:grid-cols-2 lg:gap-4 lg:px-0 xl:grid-cols-3">
          {visible.map((e) => (
            <EventRow key={e.id} event={e} />
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <nav
          aria-label="Pagination"
          className="mt-7 flex items-center justify-center gap-2 px-5"
        >
          {page > 1 && (
            <Link
              href={pageHref(page - 1)}
              className="rounded-[12px] border border-line-strong px-4 py-2.5 text-[13px] font-bold"
            >
              Previous
            </Link>
          )}
          <span className="px-2 text-[13px] text-ink-2">
            Page {page} of {pageCount}
          </span>
          {page < pageCount && (
            <Link
              href={pageHref(page + 1)}
              className="rounded-[12px] border border-line-strong px-4 py-2.5 text-[13px] font-bold"
            >
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
