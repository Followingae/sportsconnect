# Sportsconnect — Business Requirements Document

> Source: client BRD (v1, provided 2026-08-10). Known to be incomplete — gaps tracked in `docs/DESIGN-GAPS.md`.

## AMENDMENT (2026-08-10) — Payments
**Online card payments are OUT of MVP scope.** They must appear as a disabled
"Coming soon" option everywhere payment methods are shown. The only two live
payment methods at launch are:
1. **Bank Transfer** (consumer transfers, admin reconciles + marks paid)
2. **Cash at Venue** (settled on arrival, admin marks paid)

This overrides §15/§16/§17 below wherever they imply live online payment.
Payment *statuses*, refunds, receipts, platform-fee calculation and the money
trail all remain in scope — they are just settled manually rather than via a gateway.

---

## 1. Executive Summary
Multi-sport event management and registration web application enabling organizations,
sports clubs, event organizers and authorized administrators to create and manage
sports events, while allowing consumers to discover, register for, and pay for
participation online.

Primary sports: **Football, Padel, Cricket, Badminton, Basketball.**
Architecture must be flexible enough to support additional sports in future.

Three primary user areas:
1. **Super Admin Portal** — complete control over platform, users, events, payments, approvals, configuration.
2. **Event Admin Portal** — authorized admins create/manage events, participants, teams, schedules, event info.
3. **Consumer Website** — public experience to browse, register, pay, manage registrations, view event info.

All events created by Event Admins **must be reviewed and approved by a Super Admin**
before becoming publicly available.

The platform collects all registration payments. Super Admin has visibility of financial
transactions, refunds, commissions/fees and event revenue.

## 2. Business Objectives
- Centralize sports event creation and management.
- Make it easy for consumers to discover and register for sports events.
- Allow online payment for event participation. *(see AMENDMENT — deferred)*
- Reduce manual event administration.
- Allow authorized administrators to manage participants.
- Provide Super Admins with complete oversight and approval control.
- Support different registration models across different sports.
- Provide a scalable foundation for multiple sports and event formats.
- Maintain accurate participant, payment and event records.
- Provide reporting and operational visibility to platform management.

## 3. Scope

### 3.1 In Scope — Consumer
Account registration/login · Browse sports · Browse events · Search and filter events ·
View event details · Register for events · Pay online · Receive registration confirmation ·
Manage personal registrations · View payment/registration history · Cancel registration
where permitted · Receive notifications · View event status and information

### 3.1 In Scope — Event Admin
Login · Create events · Save events as drafts · Submit events for approval · Edit events ·
Manage event information · Configure registration rules · Configure participant limits ·
Add/remove participants · View participant information · Manage teams where applicable ·
View registrations · Manage event status · View event-level payment information ·
Communicate event updates · View event reports

### 3.1 In Scope — Super Admin
Full platform access · Manage Event Admins · Create/deactivate Event Admin accounts ·
Assign permissions · Approve/reject events · Edit/manage any event · Manage consumers ·
Manage sports · Manage platform settings · View all registrations · View all payments ·
Manage refunds/cancellations · Reporting and analytics · Audit logs · Configure
system-wide settings

## 4. User Roles

### 4.1 Super Admin
Unrestricted access. Responsibilities: approve events · manage administrators ·
manage consumers · manage all events · manage sports/categories · monitor payments ·
process/approve refunds where applicable · configure platform settings · view reports ·
monitor system activity.

### 4.2 Event Admin
Users authorized by the Super Admin to create and manage events. An Event Admin should
only have access to the events and functionality assigned to them, unless the Super Admin
grants broader permissions.

Example permissions: create event · edit event · submit event for approval ·
manage participants · add/remove participants · manage teams · view registrations ·
view event payments · send event notifications · manage event content.

**Permissions should ideally be configurable rather than hard-coded.**

### 4.3 Consumer / Participant
Create an account · browse events · register · pay · view registrations · update profile ·
receive notifications · view event details · cancel registrations where allowed.

## 5. Event Lifecycle

Draft → Submitted for Approval → Under Review → Approved → Published →
Registration Open → Registration Closed → Event Completed → Archived

Alternative states: **Rejected · Cancelled · Suspended · Sold Out**

### Event Approval
1. Event Admin creates an event.
2. Event Admin saves it as a draft.
3. Event Admin submits it for approval.
4. Super Admin reviews the event.
5. Super Admin can: **Approve · Reject · Request changes**
6. Once approved, the event can be published.
7. Consumers can register once registration is open.

An event must not become publicly available for registration until Super Admin approval
has been completed.

## 6. Sports & Formats
| Sport | Formats |
|---|---|
| Football | 5-a-side, 7-a-side, 9-a-side, 11-a-side, Tournament, League |
| Padel | Singles, Doubles, Tournament, Round robin, Knockout |
| Cricket | T10, T20, Tape-ball, Hard-ball, Tournament, League |
| Badminton | Singles, Doubles, Mixed doubles, Tournament |
| Basketball | 3x3, 5x5, Tournament, League |

The event model must be configurable so additional sports and formats can be introduced
without rebuilding the core platform.

## 7. Event Creation — 7.1 Basic Information
Required fields: Event name · Sport · Event type/format · Description · Organizer ·
Event image/banner · Venue · Location · Date · Start time · End time ·
Registration opening date · Registration closing date · Event status

## 8. Event Configuration — 8.1 Participant Configuration
Maximum participants · Minimum participants · Current participant count ·
Waitlist capacity · Minimum/maximum age · Gender requirements · Skill/level requirements ·
Team size · Number of teams · Number of substitutes · Individual vs team registration

## 9. Participant Management — two entry methods

**Method 1 – Consumer Registration:** finds event → selects registration → completes
required information → makes payment → registration confirmed → participant added
automatically.

**Method 2 – Admin-Added Participant:** authorized Event Admin manually adds a participant.
Scenarios: walk-in registration · offline payment · complimentary participant ·
sponsor/VIP · invitation · team registration · correcting an existing registration.
The admin can specify the participant's registration/payment status.

## 10. Participant Management Interface
Columns: Participant (name) · Email · Phone · Registration Date · Payment Status
(Paid/Pending/Refunded/etc.) · Registration Status (Confirmed/Cancelled/Waitlisted) ·
Team · Role (Player/Substitute/etc.) · Source (Online/Admin) · Actions.

Admin actions: add · edit · remove · move to waitlist · confirm · cancel registration ·
refund · assign team · remove from team · replace participant · export participants.

**All important changes recorded in an audit log.**

## 11. Team Management
Team-based sports support teams:
- **Football** — team name, captain, players, substitutes, team registration status
- **Cricket** — team name, captain, squad, substitute players
- **Basketball** — team name, captain, players, substitutes
- **Padel / Badminton** — player 1, player 2, team/pair name (format dependent)

Event Admins can assign registered participants to teams.

## 12. Event Page — Consumer Side
Every published event has a dedicated page containing: Event banner · Event name · Sport ·
Event type · Date · Time · Venue · Location/map · Organizer · Description · Rules ·
Eligibility · Registration deadline · Number of available spots · Registration fee ·
What's included · Participant requirements · Cancellation/refund policy ·
Contact information · Register button.

Example: *Dubai Padel Open 2026 · Padel | Doubles · 15 September 2026 · XYZ Padel Club ·
AED 250 / Team · 32 teams maximum · [Register Now]*

## 13. Event Discovery — Homepage sections
Hero/banner · Upcoming events · Popular sports · Events near you · Featured events ·
Recently added events · Registration closing soon · Popular venues · Promotional banners

## 14. Search & Filters
Search by: Sport · Location · Date · Price · Event format · Skill level · Gender ·
Age group · Availability · Organizer.
Sort by: Date · Popularity · Price · Recently added · Registration deadline.

## 15. Consumer Registration Flow
Event → Register → Participant Details → Additional Information → Review → Payment → Confirmation

Must clearly display: registration fee · taxes if applicable · platform/service fee if
applicable · discounts · total amount · refund policy. Before payment the consumer must
confirm acceptance of relevant event terms and conditions.

## 16. Payments
*(see AMENDMENT at top — online gateway deferred; Bank Transfer + Cash at Venue only)*

System supports: online payment · payment confirmation · failed payments ·
pending payments · refunds · partial refunds where applicable · payment history ·
transaction IDs · payment receipts.

Payment statuses: **Pending · Processing · Paid · Failed · Cancelled · Refunded ·
Partially Refunded**

Payment gateway selected during technical design based on target launch market.

## 17. Platform Revenue
Configurable platform fees. Example: Event Registration 100 + Platform Fee 5 = Total 105.
Fee configurable as: fixed amount · percentage · fixed + percentage · no platform fee.
Configurable by the Super Admin.

## 18. Refunds & Cancellations
**Consumer cancellation** (per event policy): full refund · partial refund · no refund ·
credit · transfer to another event.
**Admin cancellation**: Event Admin may request event cancellation, but Super Admin has
final authority for platform-level cancellation/refund policies.

System records: who initiated cancellation · reason · date/time · refund amount ·
payment transaction · refund status.

## 19. Super Admin Dashboard
KPIs: Total events · Pending event approvals · Upcoming events · Active events ·
Total consumers · Total Event Admins · Total registrations · Total revenue ·
Pending payments · Refunds · Cancelled events.

Charts: Revenue by month · Registrations by month · Events by sport · Revenue by sport ·
Registrations by sport · Top events · Event Admin performance.

## 20. Super Admin — Event Management
View all events · search · filter · view event details · approve · reject ·
request changes · edit · publish/unpublish · suspend · cancel · view participants ·
view payments · view event revenue · view activity logs.

## 21. Event Admin Dashboard
KPIs: Total events · Draft events · Pending approval · Approved events · Upcoming events ·
Total registrations · Available spots · Revenue · Pending payments.

Event list columns: Event name · Sport · Date · Status · Registrations · Capacity ·
Revenue · Approval status · Actions.

## 22. Event Admin — Event Builder (10 steps)
1. Basic Information
2. Sport & Format
3. Date & Venue
4. Registration Settings
5. Participant Requirements
6. Pricing
7. Rules & Information
8. Images/Media
9. Preview
10. Submit for Approval

The system must automatically validate mandatory information before allowing submission.

## 23. Event Customization
Event title · description · banner · gallery · rules · registration questions · pricing ·
participant limits · teams · categories · age groups · skill levels · venue information ·
sponsors · terms · cancellation policy.

Implemented using **configurable fields**, not separate hard-coded forms per sport.

## 24. Custom Registration Questions
Types: Text · Number · Dropdown · Multiple choice · Checkbox · Date · File upload.
Examples: jersey size · preferred position · skill level · emergency contact ·
date of birth · nationality · team name · previous experience.
Each question can be mandatory or optional.

## 25. Notifications
Email initially; SMS/WhatsApp potentially later.

**Consumer:** account created · registration successful · payment successful ·
payment failed · event reminder · event updated · event cancelled · registration cancelled ·
refund processed · waitlist promotion.

**Admin:** event submitted for approval · event approved · event rejected ·
new registration · payment received · cancellation · event capacity reached.

## 26. User Account
**Profile** — personal information, contact details, preferences, password/security.
**My Events** — upcoming, past, cancelled, waitlisted events.
**My Payments** — payment history, receipts, refunds.

## 27. Authentication
Email/password login · password reset · email verification · secure session management.
Future: Google login · Apple login · Phone OTP · social authentication.
Role-based access control must ensure users cannot access functionality outside their
assigned permissions.

## 28. Admin User Management
Super Admin can: create Event Admin · edit Event Admin · activate/deactivate account ·
reset access · assign permissions · assign events · view activity.
