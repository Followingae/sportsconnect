# Sportsconnect — Design gap analysis

**Reviewed:** `Sportsconnect Mobile.dc.html` (25 screens), `Sportsconnect Desktop.dc.html`
(12 screens), `Sportsconnect Event Admin.dc.html` (5 screens) — against the BRD
(`docs/BRD.md`) and the payments amendment.

**Scope decision applied:** MVP is the BRD's tournament/registration model. The casual
pickup-game flow from the original creative brief is out of MVP.

**Verdict:** the visual system is strong and complete enough to build from. The
*coverage* is not — 42 designed screens against roughly 95 the BRD requires. The three
files also disagree with each other in two places that must be resolved before the
design team draws anything else.

---

## 1. Blocking contradictions — fix these first

### 1.1 The Super Admin portal has two different information architectures

`Sportsconnect Desktop.dc.html` contains **two mutually incompatible sidebars**, and
different screens use different ones.

| | Screens P1–P6 | Screens P7–P12 |
|---|---|---|
| Nav items | Dashboard, **Hosts**, **Players**, Events, Payments, **Discounts**, **Moderation**, **Venues** | Dashboard, **Approvals**, Events, **Event Admins**, **Consumers**, **Sports**, Payments, **Refunds**, **Reports**, **Audit log** |
| Vocabulary | "Host", "Player" | "Event Admin", "Consumer" |
| Missing vs the other | Approvals, Sports, Refunds, Reports, Audit log | Discounts, Moderation, Venues |

These are two different products' navigation. The BRD vocabulary is **Event Admin** and
**Consumer** — the P7–P12 set. But P1–P6 contains four sections (Discounts, Moderation,
Venues, and the "needs your attention" dashboard) that P7–P12 drops and the BRD still
requires.

**Recommended merged IA — one sidebar, twelve items, grouped:**

```
OVERVIEW     Dashboard
             Approvals            (badge: pending count)
CATALOGUE    Events
             Sports & formats
             Venues               (Coming soon badge)
PEOPLE       Event Admins
             Consumers
FINANCE      Payments             (badge: unreconciled count)
             Refunds
             Discounts & credit
OVERSIGHT    Reports
             Moderation           (badge: open reports)
             Audit log
```

**Vocabulary lock — use these words everywhere, in all three portals:**

| Use | Never use |
|---|---|
| Event Admin | Host, Organizer admin |
| Consumer | Player, Member, User |
| Organizer | (the org/club name shown to consumers — this one is fine) |
| Registration | Booking, Enrolment |
| Participant | Attendee |
| Event | Game, Match |

> Note: "Organizer" is still correct on the *consumer* event page, where it means the
> club running the event. "Event Admin" is the internal role name. Don't mix them.

**Action:** redraw P1–P6 with the merged sidebar. Deliver one nav component, one set of
labels, one badge treatment.

### 1.2 Online card payment must be removed

Per your amendment, online payments are Coming Soon. Only **Bank Transfer** and **Cash
at Venue** ship.

| Screen | Shows now | Must become |
|---|---|---|
| **E6 Payment** | Full card form — card number `4242 4242…`, expiry, CVC, "Pay AED 237.50" | **Delete entirely.** Replace with a payment-method chooser (Bank transfer / Cash at venue) plus a *disabled* "Pay by card — Coming soon" tile |
| **E5 Review** | CTA "Continue to payment" | "Continue to payment instructions" |
| **E7 Confirmed** | "Paid · AED 237.50" green badge, "A receipt is on its way" | Must show **Pending payment**, not Paid. Money hasn't moved. Receipt only exists after an admin marks it paid |
| **B4 Join sheet** | Already correct (bank transfer / pay at venue) | Keep the pattern — but it needs a *following* screen that doesn't exist (see 2.1) |
| **P11 Refunds** | Status "Processing" with action label "Gateway" | No gateway exists. Refunds are settled by manual bank transfer — needs "Mark refunded" + settlement note + optional proof upload |
| **P3 Payments** | Broadly correct | Add: proof-of-transfer thumbnail, payer's quoted reference, and an "Awaiting verification" state between Pending and Paid |

**Also missing:** every screen that shows a price needs the platform fee broken out.
Only E5 does this today.

### 1.3 Authentication contradicts the BRD

**A3** designs a 6-digit phone OTP with no password. BRD §27 requires email/password,
email verification and password reset. Decision taken: **email/password for all roles.**

A3 must be replaced by five screens (see 2.1).

### 1.4 Sports shown don't match the BRD

**B2 Explore** and **B1 Home** show Tennis, Pickleball and "Pickle" filter chips.
The BRD's five sports are Football, Padel, Cricket, Badminton, Basketball. **E1 Browse
sports** gets this right. Fix B1/B2 to match E1.

### 1.5 Bottom-nav active states are wrong in two screens

**F2 Payments** highlights the *Profile* tab. **C2 Bookings** highlights *Payments* but
the screen is titled "Bookings". Pick five final tabs and make every screen agree.

Recommended: **Home · Explore · My events · Payments · Profile**

---

## 2. Missing screens

42 designed. Below is what is missing, by priority.

### 2.1 Consumer — MUST HAVE (23 screens)

**Authentication (5)** — replaces A3
- `A3a` Sign up — name, email, phone, password, terms checkbox
- `A3b` Check your email — verification sent, resend, change address
- `A3c` Log in — email, password, "forgot?", error state for wrong credentials
- `A3d` Forgot password — email entry + sent confirmation
- `A3e` Set a new password — from the reset link, with strength rules

**Payment (4)** — the biggest hole in the whole set
- `E6a` Choose payment method — Bank transfer / Cash at venue / **Card (disabled, Coming soon)**
- `E6b` **Bank transfer instructions** — account name, bank, IBAN, SWIFT, exact amount,
  the unique reference code, a copy-each-field affordance, and a clear
  "transfer within 48h or your place is released" deadline. **This screen does not
  exist anywhere and nothing can ship without it.**
- `E6c` Confirm you've transferred — optional proof-of-payment upload, "I've sent it" CTA
- `E6d` Cash at venue confirmed — what to bring, how much, who to pay, arrive-by time

**Event lifecycle states (6)** — variants of E2, currently only the happy path exists
- `E2-a` Registration not yet open — countdown, "Notify me when it opens"
- `E2-b` Registration closed — closed date, browse similar events
- `E2-c` **Sold out + join waitlist** — position in queue, what happens next
- `E2-d` Event cancelled — reason, refund status, what the consumer must do
- `E2-e` Event completed — read-only, results/photos placeholder
- `E2-f` Consumer is already registered — shows their status instead of a Register CTA

**My account (5)**
- `F3` Registration detail — full record, QR/reference for check-in, organizer contact,
  cancellation policy, "Cancel registration" entry point
- `F4` Cancel registration + refund request — policy shown *before* confirming, expected
  refund amount, reason picker
- `F5` Profile edit — name, phone, DOB, gender, nationality, avatar
- `F6` Settings — password change, email preferences, notification toggles, delete account
- `F7` Notifications inbox — BRD §25 lists 10 consumer notification types and there is
  no surface for any of them

**Discovery (3)**
- `B1-new` Home rebuilt to BRD §13: hero, **registration closing soon**, upcoming,
  featured, popular sports, recently added, near you. B1 today shows one hero card only
- `B2-new` Explore with the full BRD §14 filter set — sport, location, date, price,
  format, skill level, **gender**, **age group**, availability, organizer — plus a
  **sort control** (date / popularity / price / recently added / deadline). B2 today
  has three chips and no sort
- `B2-b` Filter sheet — the full-screen filter panel those controls open into

### 2.2 Consumer — SHOULD HAVE (5)
- Waitlist promotion — "A spot opened up, you have 24h to pay"
- Team invite accept/decline — E3 lets you invite a partner but the partner's side is undesigned
- Organizer public profile — their other events, contact
- Search results + no-results state
- Venue "Coming soon" teaser (BRD gates venue accounts; entry points exist with nowhere to go)

### 2.3 Event Admin — MUST HAVE (16 screens)

**Event builder — 8 of 10 steps are undesigned.** Only step 4 (EA2) and step 7 (EA5) exist.

| Step | Status | Fields needed (BRD §7.1, §8.1, §17, §23) |
|---|---|---|
| 1 Basic information | **missing** | Name, description, organizer, event status |
| 2 Sport & format | **missing** | Sport picker, format picker (drives everything downstream) |
| 3 Date & venue | **missing** | Start/end date+time, venue picker or free address, map pin |
| 4 Registration settings | ✅ EA2 | — |
| 5 Participant requirements | **missing** | Min/max age, gender requirement, skill levels |
| 6 Pricing | **missing** | Entry fee, per player vs per team, tax, **platform fee preview**, cancellation policy |
| 7 Rules & questions | ✅ EA5 | — |
| 8 Images & media | **missing** | Banner upload + crop, gallery, sponsor logos |
| 9 Preview | **missing** | Renders the consumer event page before submit |
| 10 Submit | **missing** | Validation summary — which required fields are still empty |

**Portal screens the sidebar links to but nobody designed (4)**
- `EA6` **Payments** — sidebar has the item, no screen. Under manual settlement this is
  the organizer's core daily tool: who has paid, who hasn't, mark cash received,
  chase list, expected vs collected
- `EA7` **Messages** — sidebar has the item, no screen. Compose to all / confirmed /
  waitlisted / unpaid, history of what was sent
- `EA8` **Reports** — BRD §3.1 requires it. Registrations over time, revenue, fill rate
- `EA9` **My events** — sidebar has the item; EA1 shows a *dashboard* list, not the
  filterable/searchable full list

**Lifecycle (4)**
- `EA10` **Rejected / changes requested inbox** — the Super Admin can reject or request
  changes with a note (P7). There is **no screen anywhere that shows the organizer that
  note.** The approval loop is currently open-ended
- `EA11` Event detail / manage hub — the landing page for one event, tying together
  participants, teams, payments, messages, settings
- `EA12` Cancel event — reason, who gets notified, refund implications
- `EA13` Login + forgot password for the organizer portal

### 2.4 Event Admin — SHOULD HAVE (4)
- Waitlist management (promote, bulk promote, capacity reached)
- Check-in / attendance mode (day-of, phone-sized)
- Account & organization settings
- Bulk actions bar for the participants table

### 2.5 Super Admin — MUST HAVE (10)
- `P13` **Create / edit Event Admin** — P8 has a "＋ Create admin" button and no form.
  Needs: name, email, organization, initial permissions, event assignments, invite send
- `P14` **Consumer detail** — P9 is a list with a "View" button that goes nowhere.
  BRD §20/§28 need registrations, payments, refunds, credit, suspend
- `P15` **Event detail (admin view)** — P5 lists events; there is no detail page with
  participants, payments, revenue, activity log, and the publish/unpublish/suspend/cancel verbs
- `P16` **Add / edit sport + formats** — P10 lists them, "＋ Add sport" has no form
- `P17` **Platform settings** — bank account details for transfers (currently hardcoded
  nowhere), support contact, currency, default terms, default cancellation policy
- `P18` **Discounts & credit** — sidebar item in P1–P6, only a grant *modal* designed
- `P19` **Refund decision** — approve/decline with amount override, policy reference,
  settlement note, proof upload
- `P20` Search + filter + pagination — **no admin list has any of these.** At 1,284
  consumers a plain list is unusable
- `P21` Login + 2FA for Super Admin
- `P22` Confirmation dialogs for every destructive verb — reject, suspend, cancel,
  refund, deactivate. None designed

### 2.6 Super Admin — dashboard is under-specified

BRD §19 lists **11 KPIs**; P1 shows 4. Missing: total events, upcoming events,
total Event Admins, total registrations, total revenue, refunds, cancelled events.

BRD §19 lists **7 charts**; P12 shows 2 (revenue by month, registrations by sport).
Missing: registrations by month, events by sport, revenue by sport, top events,
Event Admin performance.

Event Admin dashboard (EA1) shows **5 KPIs**; BRD §21 lists 9. Missing: total events,
upcoming events, available spots, pending payments.

---

## 3. Missing states on screens that do exist

| Screen | Missing |
|---|---|
| Every list / table | Empty, loading skeleton, error+retry, pagination, "no results for this filter" |
| Every form | Inline validation errors, field-level error styling, submit-failed banner, unsaved-changes warning |
| EA3 Participants | Bulk-select toolbar, export options dialog, the 11 row actions are described in a caption but never drawn |
| EA4 Teams | Incomplete team, over-capacity team, football 7-a-side and cricket 11+3 squads — the current card fits exactly 2 padel players and will break |
| E2 Event page | Cold logged-out visitor vs logged-in vs already-registered |
| B3/E2 hero | No-cover-photo fallback (the ghost-letter motif is used inconsistently) |
| P3 Payments | Partial payment, overpayment, disputed, proof attached |
| All | Offline / connection-lost |

---

## 4. Missing content fields on the consumer event page

BRD §12 lists 19 required fields. E2 renders 11. Missing:

- **Organizer** — E2 has no organizer block at all (B3 has one; E2 dropped it)
- **Rules**
- **Eligibility**
- **Participant requirements**
- **Cancellation / refund policy** — legally necessary before taking money
- **Contact information**
- **Event type/format shown explicitly** (currently only in the "Padel · Doubles" chip)
- **Registration opening date** (only the closing date is shown)

---

## 5. Craft and technical notes for the design team

1. **Frame size.** The mobile frames are 320×648. Real devices are 360–430 wide and
   780–930 tall. Please re-spec at **360** (small Android) and **430** (iPhone Pro Max).
   At 320 the E5 fee table and E4 chip rows already overflow.
2. **Icons.** Everything is a Unicode glyph (`⌂ ⊙ ▦ ▭ ◍ ⛂ ⛁ ⚑`). These render
   differently on every platform and several have no sensible meaning. Please specify a
   real icon set — Lucide is already in the build.
3. **Volt on white fails contrast.** `#C6F135` on white is ~1.4:1. The designs correctly
   use `--voltd #3C5300` for volt-coloured *text*, but please make that a written rule:
   **volt is a background colour only; volt-deep is the text colour.**
4. **Two-line rule for the fee breakdown.** Entry fee, platform fee, discount, tax, total
   — five rows minimum wherever money is shown. Currently only E5 does it.
5. **Reference code format.** The designs use `SC-7Q2K` and `SC-PADL-7Q2K`
   inconsistently. Pick one. (Build uses `SC-<SPORT>-<4 chars>`, ambiguous characters
   like O/0/I/1 excluded so it survives being read over the phone.)
6. **Responsive back-office.** Both admin portals are drawn at 1060px only. Specify
   behaviour at 768px and 1440px, or state explicitly that they're desktop-only.
7. **Skeletons.** Brief §11 asks for graceful image placeholders; none are drawn.
8. **Focus states.** No keyboard focus treatment is specified on any control.
9. **The "P" ghost letter** appears on padel screens only. Either extend it to all five
   sports as a system, or drop it.

---

## 6. Questions only the client can answer

1. **Who receives the money?** The BRD says "the platform will collect all registration
   payments", but Cash at Venue means the *organizer* physically collects it. How is the
   platform fee recovered on cash bookings — invoiced to the organizer monthly, or
   netted off? This changes the Payments screens in both admin portals.
2. **How long is a bank-transfer place held** before it's released? 24h, 48h, until
   registration closes? Drives the E6b copy and an expiry job.
3. **One bank account or one per organizer?** If per-organizer, every organizer needs
   bank fields in their profile and the transfer screen becomes dynamic.
4. **Is VAT charged?** UAE VAT is 5%. The schema supports it; no design shows it.
5. **Can a consumer register more than one team** for the same event?
6. **What happens to a team when its captain cancels?**
7. **Waitlist promotion** — automatic on cancellation, or manual by the organizer?
8. **Do Event Admins self-sign-up?** The old brief said yes-with-approval; the BRD says
   the Super Admin creates them. The BRD wins unless you say otherwise — but then the
   "become a host" entry points in the mobile design should be removed.
9. **Refund settlement** — who actually sends the money back, and do you need a
   proof-of-refund upload for the audit trail?
10. **Age/gender eligibility** — is this enforced (blocks registration) or advisory?

---

## 7. Suggested order for the design team

1. Resolve the two-IA problem and publish the vocabulary lock (§1.1)
2. Payment screens `E6a–E6d` + `P19` + `EA6` — nothing can transact without these
3. Auth set `A3a–A3e`
4. Event builder steps 1, 2, 3, 5, 6, 8, 9, 10
5. Event lifecycle states `E2-a` … `E2-f`
6. Admin detail screens `P13`–`P17` and the list search/filter/pagination pattern
7. `EA10` rejection inbox — closes the approval loop
8. States pass: empty, loading, error, validation across everything

Items 1–3 are the critical path. Everything else can proceed in parallel with build,
because the design system itself is settled and the build is already token-driven.
