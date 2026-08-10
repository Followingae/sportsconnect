import { notFound } from "next/navigation";
import { BellRing } from "lucide-react";
import { getEventBySlug } from "@/lib/queries/events";
import { isSupabaseConfigured } from "@/lib/env";
import { SetupNotice } from "@/components/setup-notice";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";

export const metadata = { title: "Get notified" };

/**
 * Reached from the "not yet open" state. Signing in is the reminder — we
 * already have the address, so there is nothing more to collect.
 */
export default async function NotifyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isSupabaseConfigured()) return <SetupNotice />;

  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  return (
    <div className="px-5 pt-8 text-center">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-volt text-ink">
        <BellRing size={26} aria-hidden />
      </div>

      <h1 className="mt-6 text-h2">We&apos;ll tell you when it opens</h1>
      <p className="mt-3 text-[14.5px] leading-relaxed text-ink-2">
        Registration for <strong className="text-ink">{event.name}</strong> opens{" "}
        {event.registration_opens_at
          ? formatDateTime(event.registration_opens_at)
          : "soon"}
        . Sign in and we&apos;ll email you the moment it does.
      </p>

      <Card className="mt-6 p-4 text-left">
        <div className="flex justify-between text-[13.5px]">
          <span className="text-ink-2">Event starts</span>
          <span className="font-semibold">{formatDateTime(event.starts_at)}</span>
        </div>
        {event.venue_name && (
          <div className="mt-2.5 flex justify-between text-[13.5px]">
            <span className="text-ink-2">Venue</span>
            <span className="font-semibold">{event.venue_name}</span>
          </div>
        )}
      </Card>

      <div className="mt-7 flex flex-col gap-2.5">
        <ButtonLink href={`/login?next=/e/${event.slug}`} size="lg" block>
          Sign in for a reminder
        </ButtonLink>
        <ButtonLink href={`/e/${event.slug}`} variant="ghost" size="lg" block>
          Back to event
        </ButtonLink>
      </div>
    </div>
  );
}
