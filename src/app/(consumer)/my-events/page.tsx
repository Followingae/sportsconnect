import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getMyRegistrations } from "@/lib/queries/my";
import { isSupabaseConfigured } from "@/lib/env";
import { SetupNotice } from "@/components/setup-notice";
import { Cover } from "@/components/ui/cover";
import { RegistrationStatusBadge, PaymentStatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/feedback";
import { formatWhen, money } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata = { title: "My events" };
export const dynamic = "force-dynamic";

const TABS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "waitlist", label: "Waitlist" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
] as const;

export default async function MyEventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my-events");

  const { tab } = await searchParams;
  const active = (TABS.find((t) => t.key === tab)?.key ?? "upcoming") as
    (typeof TABS)[number]["key"];

  const groups = await getMyRegistrations(user.id);
  const rows = groups[active];

  return (
    <div>
      <header className="px-5 pt-4">
        <h1 className="text-h2">My events</h1>
      </header>

      <nav
        aria-label="Registration status"
        className="no-scrollbar mt-4 flex gap-6 overflow-x-auto border-b border-line px-5"
      >
        {TABS.map((t) => {
          const isActive = t.key === active;
          const count = groups[t.key].length;
          return (
            <Link
              key={t.key}
              href={`/my-events?tab=${t.key}`}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative shrink-0 pb-3 text-[14px]",
                isActive ? "font-bold text-ink" : "font-semibold text-ink-3"
              )}
            >
              {t.label}
              {count > 0 && <span className="ml-1.5 tabular-nums">{count}</span>}
              {isActive && (
                <span className="absolute inset-x-0 -bottom-px h-[3px] rounded-full bg-volt" />
              )}
            </Link>
          );
        })}
      </nav>

      {rows.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={<CalendarCheck size={22} />}
          title={
            active === "upcoming"
              ? "No upcoming events"
              : active === "waitlist"
                ? "You're not on any waitlists"
                : active === "past"
                  ? "Nothing here yet"
                  : "No cancelled registrations"
          }
          body={
            active === "upcoming"
              ? "Find a tournament or league near you and register your team."
              : undefined
          }
          actionLabel={active === "upcoming" ? "Explore events" : undefined}
          actionHref="/explore"
        />
      ) : (
        <div className="mt-4 flex flex-col gap-3.5 px-5">
          {rows.map((r) => {
            const e = r.event;
            if (!e) return null;
            const payment = r.payment;
            const owes =
              payment && ["pending", "processing"].includes(payment.status);

            return (
              <article
                key={r.id}
                className="overflow-hidden rounded-card border border-line bg-white"
              >
                <Link href={`/e/${e.slug}`} className="block">
                  <Cover
                    src={e.banner_url ?? e.sport?.cover_url ?? null}
                    alt=""
                    scrim="bottom"
                    sizes="(max-width: 560px) 100vw, 560px"
                    rounded="rounded-none"
                    fallbackLabel={e.sport?.name?.[0]}
                    className="h-[92px] w-full"
                  >
                    <div className="absolute inset-x-4 bottom-3 text-white">
                      <p className="text-[15px] font-extrabold leading-tight">{e.name}</p>
                      <p className="mt-0.5 text-[11.5px] text-white/85">
                        {formatWhen(e.starts_at)}
                        {r.team ? ` · Team ${r.team.name}` : ""}
                      </p>
                    </div>
                  </Cover>
                </Link>

                <div className="flex flex-wrap items-center justify-between gap-2.5 p-3.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <RegistrationStatusBadge status={r.status} />
                    {payment && <PaymentStatusBadge status={payment.status} />}
                    {r.status === "waitlisted" && r.waitlist_position && (
                      <span className="text-[12px] text-ink-2">
                        #{r.waitlist_position} in line
                      </span>
                    )}
                  </div>

                  {owes ? (
                    <Link
                      href={`/payments#${payment!.reference_code}`}
                      className="text-[13px] font-bold text-volt-deep"
                    >
                      {payment!.status === "processing"
                        ? "Awaiting verification"
                        : `Pay ${money(payment!.total_amount, payment!.currency)}`}
                    </Link>
                  ) : (
                    <Link
                      href={`/my-events/${r.id}`}
                      className="text-[13px] font-bold text-ink-2"
                    >
                      Details
                    </Link>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
