import { Building2 } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ComingSoonBadge } from "@/components/ui/badge";

export const metadata = { title: "List your venue" };

/** BRD gates venue accounts. This is a believable future tab, not a dead end. */
export default function VenuesPage() {
  const benefits = [
    ["Fill empty courts", "Organizers find and book your slots directly."],
    ["One calendar", "Every booking in one place, no phone tag."],
    ["Get paid on time", "Settlement handled by Sportsconnect."],
  ];

  return (
    <div className="px-5 pt-6 lg:max-w-[720px] lg:px-0 lg:pt-0">
      <ComingSoonBadge />
      <h1 className="mt-3 text-h1">Bring your courts online</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-ink-2">
        Venue accounts aren&apos;t live yet. Register your interest and we&apos;ll set you
        up before the public launch.
      </p>

      <div className="mt-7 flex flex-col gap-3">
        {benefits.map(([title, body]) => (
          <div key={title} className="flex gap-3.5 rounded-card border border-line p-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-[11px] bg-volt-wash text-volt-deep">
              <Building2 size={18} aria-hidden />
            </span>
            <div>
              <p className="text-[14.5px] font-extrabold">{title}</p>
              <p className="mt-0.5 text-[13px] text-ink-2">{body}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-7 rounded-card-lg bg-ink p-5 text-white">
        <p className="text-[16px] font-extrabold">Want to be first?</p>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-inverse">
          Email us and we&apos;ll add you to the venue pilot.
        </p>
        <a
          href="mailto:venues@sportsconnect.ae?subject=Venue%20pilot"
          className="mt-4 inline-flex rounded-[12px] bg-volt px-4 py-2.5 text-[14px] font-bold text-ink"
        >
          venues@sportsconnect.ae
        </a>
      </div>

      <div className="mt-6">
        <ButtonLink href="/explore" variant="ghost" size="md" block>
          Browse events instead
        </ButtonLink>
      </div>
    </div>
  );
}
