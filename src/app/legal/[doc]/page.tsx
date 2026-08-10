import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-static";

/**
 * Placeholder legal pages so the footer and signup links resolve. The client's
 * lawyers supply the final copy — this page is deliberately honest that the
 * text is not yet final rather than inventing binding terms.
 */
const DOCS: Record<string, { title: string; intro: string; points: string[] }> = {
  terms: {
    title: "Terms of use",
    intro:
      "These terms govern your use of Sportsconnect. Final wording is being prepared with our legal advisers — this summary describes how the platform actually works today.",
    points: [
      "Sportsconnect is a booking and event-management platform. Events are run by independent organizers, not by Sportsconnect.",
      "Every event is reviewed by Sportsconnect before it becomes publicly visible.",
      "Registration fees, and any platform fee, are collected by Sportsconnect. Cash taken at a venue is collected by the organizer on our behalf.",
      "Each event sets its own cancellation and refund policy, shown before you pay.",
      "You must be old enough to meet the eligibility rules the organizer sets for an event.",
    ],
  },
  privacy: {
    title: "Privacy",
    intro:
      "What we collect and why. Final wording is being prepared with our legal advisers — this summary describes current practice.",
    points: [
      "We store your name, email, phone and the registrations you make, so organizers can run their events and contact participants.",
      "Organizers see the participant details for their own events only.",
      "Payment is settled by bank transfer or cash. We store the reference and amount, never card details.",
      "We send transactional email about your registrations and payments.",
      "Ask us to export or delete your data at any time: privacy@sportsconnect.ae.",
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(DOCS).map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  return { title: DOCS[doc]?.title ?? "Legal" };
}

export default async function LegalPage({ params }: { params: Promise<{ doc: string }> }) {
  const { doc } = await params;
  const content = DOCS[doc];
  if (!content) notFound();

  return (
    <main id="main" className="mx-auto max-w-[680px] px-6 py-14">
      <Link href="/" className="inline-flex items-baseline text-[19px] font-extrabold tracking-[-0.03em]">
        sports<span className="text-volt-word">connect</span>
      </Link>

      <h1 className="mt-8 text-h1">{content.title}</h1>
      <p className="mt-4 text-[15px] leading-relaxed text-ink-2">{content.intro}</p>

      <ul className="mt-7 flex flex-col gap-3.5">
        {content.points.map((p) => (
          <li key={p} className="flex gap-3">
            <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-volt" />
            <span className="text-[14.5px] leading-relaxed text-ink-2">{p}</span>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-[13px] text-ink-3">
        Questions? <a href="mailto:hello@sportsconnect.ae" className="font-bold text-volt-deep">hello@sportsconnect.ae</a>
      </p>
    </main>
  );
}
