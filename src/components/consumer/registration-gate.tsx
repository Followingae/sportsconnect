import Link from "next/link";
import { formatDate, formatDateTime, money } from "@/lib/format";
import { ctaFor, type RegistrationGate } from "@/lib/event-state";
import { REGISTRATION_STATUS } from "@/lib/status";
import type { Enums } from "@/lib/database.types";
import { cn } from "@/lib/cn";

/**
 * The sticky bottom bar on the event page. Every lifecycle state gets an honest
 * explanation rather than a disabled button with no reason.
 */
export function RegistrationGateBar({
  gate,
  slug,
  price,
  currency,
  priceUnit,
  model,
}: {
  gate: RegistrationGate;
  slug: string;
  price: number;
  currency: string;
  priceUnit: string;
  model: Enums<"registration_model">;
}) {
  const label = ctaFor(gate, model);
  const priceLine =
    price > 0 ? money(price, currency) : "Free";
  const priceCaption = priceUnit === "per_team" ? "Per team" : "Per player";

  const message = explain(gate);

  return (
    <div
      className="stick-fade fixed inset-x-0 bottom-0 z-30 mx-auto max-w-[560px] px-5 pt-7"
      style={{ paddingBottom: "calc(var(--nav-clearance) + 4px)" }}
    >
      {message && (
        <p
          className={cn(
            "mb-3 rounded-[12px] px-3.5 py-2.5 text-[12.5px] font-semibold",
            message.tone === "danger" && "bg-danger-wash text-danger",
            message.tone === "warning" && "bg-warning-wash text-warning",
            message.tone === "info" && "bg-info-wash text-info",
            message.tone === "success" && "bg-success-wash text-success"
          )}
        >
          {message.text}
        </p>
      )}

      <div className="flex items-center gap-3.5">
        <div className="shrink-0">
          <div className="text-[12px] text-ink-3">{priceCaption}</div>
          <div className="text-[21px] font-extrabold tabular-nums">{priceLine}</div>
        </div>

        {label ? (
          <Link
            href={hrefFor(gate, slug)}
            className={cn(
              "flex flex-1 items-center justify-center rounded-btn px-5 py-[17px]",
              "text-[16px] font-extrabold",
              gate.kind === "already_registered"
                ? "border border-line-strong bg-white text-ink"
                : "bg-volt text-ink"
            )}
          >
            {label}
          </Link>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-btn bg-soft px-5 py-[17px] text-[15px] font-bold text-ink-3">
            Registration unavailable
          </div>
        )}
      </div>
    </div>
  );
}

function hrefFor(gate: RegistrationGate, slug: string) {
  switch (gate.kind) {
    case "waitlist":
      return `/e/${slug}/register?waitlist=1`;
    case "already_registered":
      return `/my-events`;
    case "not_yet_open":
      return `/e/${slug}/notify`;
    default:
      return `/e/${slug}/register`;
  }
}

function explain(
  gate: RegistrationGate
): { text: string; tone: "danger" | "warning" | "info" | "success" } | null {
  switch (gate.kind) {
    case "open":
      if (gate.spotsLeft == null) return null;
      if (gate.spotsLeft <= 3)
        return {
          text: gate.spotsLeft === 1 ? "Last place left." : `Only ${gate.spotsLeft} places left.`,
          tone: "warning",
        };
      return null;
    case "waitlist":
      return {
        text: `This event is full. ${gate.waitlistLeft ?? "Some"} waitlist places remain — you'll be told if one frees up.`,
        tone: "info",
      };
    case "full":
      return { text: "This event is full and the waitlist is closed.", tone: "info" };
    case "not_yet_open":
      return {
        text: `Registration opens ${formatDateTime(gate.opensAt)}.`,
        tone: "info",
      };
    case "closed":
      return {
        text: gate.closedAt
          ? `Registration closed on ${formatDate(gate.closedAt)}.`
          : "Registration has closed.",
        tone: "info",
      };
    case "cancelled":
      return {
        text: gate.reason
          ? `This event was cancelled: ${gate.reason}`
          : "This event was cancelled. Any payments will be refunded.",
        tone: "danger",
      };
    case "completed":
      return { text: "This event has finished.", tone: "info" };
    case "already_registered": {
      const meta = REGISTRATION_STATUS[gate.status];
      return {
        text: `You're already registered — ${meta.label.toLowerCase()}.`,
        tone: gate.status === "confirmed" ? "success" : "warning",
      };
    }
    default:
      return { text: gate.kind === "unavailable" ? gate.label : "", tone: "info" };
  }
}
