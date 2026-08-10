import type { Enums } from "@/lib/database.types";

/**
 * One function decides what a consumer can do with an event, so the event page,
 * the card, the registration route guard and the organizer preview can never
 * disagree about whether registration is open.
 */

export type RegistrationGate =
  | { kind: "open"; spotsLeft: number | null }
  | { kind: "waitlist"; waitlistLeft: number | null }
  | { kind: "not_yet_open"; opensAt: string }
  | { kind: "closed"; closedAt: string | null }
  | { kind: "full" }
  | { kind: "cancelled"; reason: string | null }
  | { kind: "completed" }
  | { kind: "unavailable"; label: string }
  | { kind: "already_registered"; status: Enums<"registration_status"> };

export type EventLike = {
  status: Enums<"event_status">;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  starts_at: string;
  cancellation_reason?: string | null;
  registration_model: Enums<"registration_model">;
};

export type CapacityLike = {
  /** Confirmed + pending. Pending holds a place until the deadline (D5). */
  taken: number;
  waitlisted: number;
  maxParticipants: number | null;
  maxTeams: number | null;
  waitlistCapacity: number;
};

export function capacityOf(cap: CapacityLike, model: Enums<"registration_model">) {
  const limit = model === "team" ? cap.maxTeams : cap.maxParticipants;
  const spotsLeft = limit == null ? null : Math.max(0, limit - cap.taken);
  const waitlistLeft =
    cap.waitlistCapacity > 0 ? Math.max(0, cap.waitlistCapacity - cap.waitlisted) : 0;
  return { limit, spotsLeft, waitlistLeft, isFull: spotsLeft !== null && spotsLeft <= 0 };
}

export function gateFor(
  event: EventLike,
  cap: CapacityLike,
  existing?: { status: Enums<"registration_status"> } | null,
  now: Date = new Date()
): RegistrationGate {
  if (existing && existing.status !== "cancelled") {
    return { kind: "already_registered", status: existing.status };
  }

  switch (event.status) {
    case "cancelled":
      return { kind: "cancelled", reason: event.cancellation_reason ?? null };
    case "completed":
    case "archived":
      return { kind: "completed" };
    case "registration_closed":
      return { kind: "closed", closedAt: event.registration_closes_at };
    case "sold_out": {
      // Sold out still offers the waitlist when there is room in it — that is
      // the whole point of having one. Only a full waitlist is a dead end.
      const { waitlistLeft } = capacityOf(cap, event.registration_model);
      return waitlistLeft > 0 ? { kind: "waitlist", waitlistLeft } : { kind: "full" };
    }
    case "registration_open":
      break;
    case "published":
    case "approved":
      // Approved/published but the window hasn't been opened yet.
      return {
        kind: "not_yet_open",
        opensAt: event.registration_opens_at ?? event.starts_at,
      };
    default:
      // draft / submitted / under_review / rejected / suspended are not public.
      return { kind: "unavailable", label: "This event isn't open for registration." };
  }

  const opens = event.registration_opens_at ? new Date(event.registration_opens_at) : null;
  const closes = event.registration_closes_at
    ? new Date(event.registration_closes_at)
    : null;

  if (opens && now < opens) {
    return { kind: "not_yet_open", opensAt: event.registration_opens_at! };
  }
  if (closes && now > closes) {
    return { kind: "closed", closedAt: event.registration_closes_at };
  }

  const { spotsLeft, waitlistLeft, isFull } = capacityOf(cap, event.registration_model);

  if (isFull) {
    return waitlistLeft > 0 ? { kind: "waitlist", waitlistLeft } : { kind: "full" };
  }

  return { kind: "open", spotsLeft };
}

/** The sticky CTA label for each gate. */
export function ctaFor(gate: RegistrationGate, model: Enums<"registration_model">) {
  switch (gate.kind) {
    case "open":
      return model === "team" ? "Register your team" : "Register now";
    case "waitlist":
      return "Join the waitlist";
    case "already_registered":
      return "View your registration";
    case "not_yet_open":
      return "Notify me when it opens";
    default:
      return null;
  }
}
