# Sportsconnect

Multi-sport event management and registration platform for Dubai — football,
padel, cricket, badminton and basketball.

One Next.js app serves three portals:

| Portal | Route | Production host | Who |
|---|---|---|---|
| Consumer | `/` | `sportsconnect.ae` | Players browsing and registering |
| Event Admin | `/organizer` | `organizer.sportsconnect.ae` | Clubs and organizers running events |
| Super Admin | `/admin` | `admin.sportsconnect.ae` | Platform operators |

Subdomains are rewritten onto the path prefixes in `src/middleware.ts`, so every
route also works on `localhost` and Vercel preview URLs where subdomains aren't
available.

## Stack

- **Next.js 15** (App Router, React 19, TypeScript) on Vercel
- **Tailwind CSS 4** — all design tokens live in `src/app/globals.css`
- **Supabase** — Postgres, Auth, Row Level Security

## Getting started

```bash
npm install
cp .env.example .env.local     # then fill in the Supabase keys
npm run db:push                # apply migrations
npm run db:seed                # sports, formats, platform fee, settings
npm run db:users               # one test account per role
npm run db:seed-demo           # demo events covering every lifecycle state
npm run dev
```

### Test accounts

| Role | Email | Lands on |
|---|---|---|
| Super Admin | `admin@sportsconnect.ae` | `/admin` |
| Event Admin | `organizer@sportsconnect.ae` | `/organizer` |
| Consumer | `player@sportsconnect.ae` | `/home` |

Each account has its own randomly generated password — there is no shared one.
Run `npm run accounts` to rotate them and regenerate
`Sportsconnect-Test-Accounts.pdf`. Both that PDF and `credentials.json` are
gitignored and must never be committed.

`npm run db:users` seeds the accounts for a fresh database; `npm run accounts`
is what makes them safe to hand out.

## Scripts

| Command | What it does |
|---|---|
| `npm run db:push` | Apply every migration in `supabase/migrations`, tracked in `_migrations` |
| `npm run db:types` | Regenerate `src/lib/database.types.ts` from the live schema |
| `npm run db:seed` | Reference data — sports, formats, fee config, platform settings |
| `npm run db:users` | Create one pre-confirmed account per role |
| `npm run db:seed-demo` | Demo events in every lifecycle state |
| `npm run db:check` | Sign in as each role and assert the RLS boundaries hold |

**Run `npm run db:types` after every migration.** `supabase gen types` needs
Docker, which isn't always available, so `scripts/gen-types.mjs` introspects the
database directly and emits the same shape — including real foreign-key
`Relationships`, without which every nested select types as `SelectQueryError`.

## Environment

| Variable | Notes |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Safe in the browser; RLS does the enforcing |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server only.** Bypasses RLS entirely |
| `DATABASE_URL` | Only used by the `scripts/` — use the **pooler** host, not `db.<ref>.supabase.co`, which is IPv6-only |
| `NEXT_PUBLIC_SITE_URL` | Absolute origin, used for auth redirects and OpenGraph |

On Vercel, set all of these in **Project Settings → Environment Variables** for
Production, Preview and Development. Nothing in `.env.local` is committed.

## Architecture notes

**Money is computed server-side, never trusted from the client.** The register
action re-reads the event, resolves the platform fee and account perks, and
recomputes the total before writing the payment row. `src/lib/pricing.ts` is the
only place that does arithmetic on money.

**Payment settlement is manual.** Card payments are out of MVP scope. Only bank
transfer and cash at venue are selectable, gated by
`platform_settings.payment_methods_enabled`. Nothing in the consumer or organizer
path can mark a payment `paid` — that is a Super Admin action. See
`docs/DECISIONS.md` D3 and D4.

**One vocabulary for status.** `src/lib/status.ts` owns every label, tone and
legal state transition, so the three portals can never disagree about what
"Pending" means or which transitions are allowed.

**One gate for registration.** `src/lib/event-state.ts` decides whether a person
can register, join a waitlist, or neither. The event page, the register route
guard and the server action all call it, so a stale tab can't walk into a closed
or full event.

## Documentation

| File | Contents |
|---|---|
| `docs/BRD.md` | The client requirements, with the payments amendment at the top |
| `docs/DECISIONS.md` | Decisions taken during build, and what's still open |
| `docs/DESIGN-GAPS.md` | Design QA against the handoff files |
