# Product decisions

Decisions taken during build that aren't in the BRD, or that override it.
Each one is load-bearing — changing it changes code.

## D1 · MVP is the BRD tournament/registration model
*2026-08-10*

The creative brief describes casual pickup games (a host spins up "Morning Rally",
shares a WhatsApp link, 3 spots left). The BRD describes formal event registration with
Super Admin approval, teams and entry fees. **The BRD wins.**

Consequences:
- Flow B in the mobile design (B1 hero pickup card, B3 "Join match") is out of scope.
- Every event goes through the approval lifecycle before it is publicly visible.
- "Match" is not product vocabulary. Use "event".

## D2 · Email/password auth for all roles
*2026-08-10*

BRD §27 over design screen A3's phone OTP. Phone is collected at signup as contact
detail, not as a credential. Phone OTP stays a future option.

## D3 · Online card payment is out of MVP
*2026-08-10 — client amendment*

Only **Bank Transfer** and **Cash at Venue** are live. Card payment appears everywhere
as a visible but disabled "Coming soon" option.

Implementation: the `payment_method` enum keeps an `online` member so no migration is
needed when a gateway lands, but `platform_settings.payment_methods_enabled` gates what
the UI may offer, and it ships as `{bank_transfer, cash_at_venue}`.

## D4 · The Super Admin holds all money, including cash at venue
*2026-08-10*

Even though the organizer physically takes cash at the venue, that money belongs to the
platform. The organizer collects on the platform's behalf and remits.

Consequences:
- **Only a Super Admin can move a payment to `paid`.** Event Admins can see payment
  state and record that they collected cash, but their action sets `processing`
  ("collected, awaiting reconciliation"), never `paid`.
- The platform fee is not invoiced separately. The full amount is owed to the platform,
  which settles with organizers separately (out of scope for MVP — reporting only).
- Event Admin "revenue" figures are **expected collection**, not received funds. Label
  them that way in the UI.

## D5 · A pending place is held until registration closes
*2026-08-10*

No 24/48-hour expiry timer on unpaid bank transfers. A pending registration holds its
place until `registration_closes_at`, or until a Super Admin resolves it manually.

Consequences:
- No expiry job, no cron, no auto-release. Deliberate: it avoids releasing a place from
  someone whose transfer is simply slow to clear.
- The trade-off is that unpaid holds can occupy capacity right up to the deadline. The
  mitigation is visibility, not automation: the Super Admin payments screen leads with
  unreconciled pending payments, and organizers get a chase list.
- Copy on the bank-transfer screen must say the place is held until the registration
  deadline — never quote a fixed number of hours.

## D6 · Super Admin portal information architecture
*2026-08-10*

The desktop design file contains two incompatible sidebars. Resolved to one 12-item
sidebar in five groups (Overview / Catalogue / People / Finance / Oversight), and a
vocabulary lock: **Event Admin** (not Host), **Consumer** (not Player), **Registration**
(not Booking), **Participant** (not Attendee), **Event** (not Match/Game).

See `docs/DESIGN-GAPS.md` §1.1.

## Still open

- **VAT.** UAE VAT is 5%. Schema supports `tax_percent` per event; defaults to 0 until
  the client confirms whether it is charged.
- **Multiple teams per consumer per event.** Currently blocked by a unique index on
  (event_id, user_id) for non-cancelled rows.
- **Captain cancels** — what happens to the team. Currently the team survives and the
  captaincy must be reassigned by the organizer.
- **Waitlist promotion** — currently manual by the organizer; not automatic on
  cancellation.
- **Age/gender eligibility** — currently advisory (shown, not enforced at registration).
