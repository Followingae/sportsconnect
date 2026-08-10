import type { Enums } from "@/lib/database.types";

/**
 * Single source of truth for how every status is labelled and coloured.
 * Screens must never invent their own copy for a status — import from here so
 * the consumer app, organizer portal and admin portal always agree.
 */

export type Tone =
  | "neutral" // muted grey — inert states (draft, archived)
  | "volt" // brand wash — "live / in the money" positives
  | "success" // green — settled, approved, confirmed
  | "warning" // amber — needs a human to act
  | "danger" // red — rejected, failed, cancelled
  | "info"; // blue — in flight, informational

export type StatusMeta = { label: string; tone: Tone; help?: string };

// --- Event lifecycle (BRD §5) ----------------------------------------------

export const EVENT_STATUS: Record<Enums<"event_status">, StatusMeta> = {
  draft: { label: "Draft", tone: "neutral", help: "Not submitted yet. Only you can see it." },
  submitted: { label: "Submitted", tone: "warning", help: "Waiting for Super Admin review." },
  under_review: { label: "Under review", tone: "warning", help: "A Super Admin is reviewing it." },
  changes_requested: {
    label: "Changes requested",
    tone: "warning",
    help: "The reviewer left notes. Address them and resubmit.",
  },
  approved: { label: "Approved", tone: "success", help: "Cleared for publishing." },
  published: { label: "Published", tone: "success", help: "Visible to the public." },
  registration_open: { label: "Registration open", tone: "volt", help: "Accepting registrations." },
  registration_closed: {
    label: "Registration closed",
    tone: "info",
    help: "No longer accepting registrations.",
  },
  completed: { label: "Completed", tone: "neutral", help: "The event has finished." },
  archived: { label: "Archived", tone: "neutral" },
  rejected: { label: "Rejected", tone: "danger", help: "Not approved. See the reviewer's note." },
  cancelled: { label: "Cancelled", tone: "danger" },
  suspended: { label: "Suspended", tone: "danger", help: "Hidden by a Super Admin." },
  sold_out: { label: "Sold out", tone: "info", help: "At capacity. Waitlist may be open." },
};

/** Statuses a signed-out visitor is allowed to see. Mirrors is_publicly_visible() in SQL. */
export const PUBLIC_EVENT_STATUSES: Enums<"event_status">[] = [
  "published",
  "registration_open",
  "registration_closed",
  "completed",
  "sold_out",
  "cancelled",
];

/** Only these accept new registrations. */
export const REGISTERABLE_STATUSES: Enums<"event_status">[] = ["registration_open"];

/**
 * Which transitions are legal, so no screen can push an event into a state the
 * BRD does not allow. Keyed by current status.
 */
export const EVENT_TRANSITIONS: Record<Enums<"event_status">, Enums<"event_status">[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["under_review", "approved", "rejected", "changes_requested"],
  under_review: ["approved", "rejected", "changes_requested"],
  changes_requested: ["submitted", "cancelled"],
  approved: ["published", "cancelled", "suspended"],
  published: ["registration_open", "suspended", "cancelled"],
  registration_open: ["registration_closed", "sold_out", "suspended", "cancelled"],
  sold_out: ["registration_open", "registration_closed", "cancelled"],
  registration_closed: ["completed", "cancelled"],
  completed: ["archived"],
  archived: [],
  rejected: ["draft"],
  cancelled: ["archived"],
  suspended: ["published", "registration_open", "cancelled"],
};

export function canTransition(
  from: Enums<"event_status">,
  to: Enums<"event_status">
): boolean {
  return EVENT_TRANSITIONS[from].includes(to);
}

// --- Registration (BRD §10) -------------------------------------------------

export const REGISTRATION_STATUS: Record<Enums<"registration_status">, StatusMeta> = {
  pending: { label: "Pending", tone: "warning", help: "Awaiting payment or confirmation." },
  confirmed: { label: "Confirmed", tone: "success" },
  waitlisted: { label: "Waitlisted", tone: "info", help: "You'll be promoted if a spot frees up." },
  cancelled: { label: "Cancelled", tone: "danger" },
  no_show: { label: "No show", tone: "danger" },
};

export const PARTICIPANT_ROLE: Record<Enums<"participant_role">, string> = {
  player: "Player",
  captain: "Captain",
  substitute: "Substitute",
};

export const REGISTRATION_SOURCE: Record<Enums<"registration_source">, string> = {
  online: "Online",
  admin: "Admin",
};

// --- Money (BRD §16) --------------------------------------------------------

export const PAYMENT_STATUS: Record<Enums<"payment_status">, StatusMeta> = {
  pending: { label: "Pending", tone: "warning", help: "Not settled yet." },
  processing: { label: "Processing", tone: "info", help: "Transfer reported, being verified." },
  paid: { label: "Paid", tone: "success" },
  failed: { label: "Failed", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "neutral" },
  refunded: { label: "Refunded", tone: "info" },
  partially_refunded: { label: "Partially refunded", tone: "info" },
};

export const PAYMENT_METHOD: Record<
  Enums<"payment_method">,
  { label: string; blurb: string; enabled: boolean }
> = {
  bank_transfer: {
    label: "Bank transfer",
    blurb: "Transfer the total and quote your reference. We confirm within 24h.",
    enabled: true,
  },
  cash_at_venue: {
    label: "Cash at venue",
    blurb: "Pay the organizer in cash when you arrive.",
    enabled: true,
  },
  // PAYMENTS AMENDMENT: shown as a disabled "Coming soon" tile, never selectable.
  online: {
    label: "Pay online by card",
    blurb: "Card payments are coming soon.",
    enabled: false,
  },
  comp: {
    label: "Complimentary",
    blurb: "No charge — added by an organizer.",
    enabled: false,
  },
};

export const REFUND_STATUS: Record<Enums<"refund_status">, StatusMeta> = {
  requested: { label: "Requested", tone: "warning" },
  approved: { label: "Approved", tone: "info", help: "Cleared — awaiting manual settlement." },
  processing: { label: "Processing", tone: "info" },
  refunded: { label: "Refunded", tone: "success" },
  declined: { label: "Declined", tone: "danger" },
};

export const REFUND_TYPE: Record<Enums<"refund_type">, string> = {
  full: "Full refund",
  partial: "Partial refund",
  credit: "Account credit",
  transfer: "Transfer to another event",
  none: "No refund",
};

// --- Event Admin permissions (BRD §4.2) -------------------------------------

export const PERMISSIONS = [
  { key: "create_event", label: "Create event" },
  { key: "edit_event", label: "Edit event" },
  { key: "submit_event", label: "Submit for approval" },
  { key: "manage_participants", label: "Manage participants" },
  { key: "add_remove_participants", label: "Add / remove participants" },
  { key: "manage_teams", label: "Manage teams" },
  { key: "view_registrations", label: "View registrations" },
  { key: "view_payments", label: "View payments" },
  { key: "send_notifications", label: "Send notifications" },
  { key: "manage_content", label: "Manage event content" },
  { key: "export_data", label: "Export data" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

/** Sensible defaults applied when a Super Admin creates a new Event Admin. */
export const DEFAULT_PERMISSIONS: PermissionKey[] = [
  "create_event",
  "edit_event",
  "submit_event",
  "manage_participants",
  "add_remove_participants",
  "manage_teams",
  "view_registrations",
  "manage_content",
];
