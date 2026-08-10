import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganizerEvent } from "@/lib/queries/organizer";
import { EventStatusBadge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const TABS = [
  { seg: "", label: "Overview" },
  { seg: "participants", label: "Participants" },
  { seg: "teams", label: "Teams" },
  { seg: "payments", label: "Payments" },
  { seg: "messages", label: "Messages" },
  { seg: "edit", label: "Edit" },
];

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getOrganizerEvent(id);
  if (!event) notFound();

  return (
    <>
      <header className="border-b border-line px-5 py-3.5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-semibold text-ink-3">
              {event.sport?.name}
              {event.format ? ` · ${event.format.name}` : ""} · {formatDate(event.starts_at)}
            </p>
            <h1 className="mt-0.5 truncate text-[17px] font-extrabold tracking-[-0.02em]">
              {event.name}
            </h1>
          </div>
          <EventStatusBadge status={event.status} />
        </div>

        <nav aria-label="Event sections" className="no-scrollbar mt-3 flex gap-5 overflow-x-auto">
          {TABS.map((t) => (
            <Link
              key={t.seg}
              href={`/organizer/events/${id}${t.seg ? `/${t.seg}` : ""}`}
              className="shrink-0 pb-1 text-[13px] font-semibold text-ink-2 hover:text-ink"
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
    </>
  );
}
