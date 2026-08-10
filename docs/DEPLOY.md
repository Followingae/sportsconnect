# Deploying

The repo is committed locally with the remote already set to
`https://github.com/Followingae/sportsconnect.git`. Nothing has been pushed —
this machine has no GitHub credentials.

## 1. Push

```bash
cd C:\Users\user\Desktop\SportsConnect
gh auth login          # or: git remote set-url origin <PAT url>
git push -u origin main
```

Three commits are waiting. `.env.local` is gitignored, so no secrets go up.

## 2. Vercel environment variables

Set these in **Project Settings → Environment Variables** for **Production,
Preview and Development**. Vercel will not build a working app without the
first two.

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://ldgymkxdlguowriprxpt.supabase.co` | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon JWT | Safe in the browser; RLS enforces access |
| `SUPABASE_SERVICE_ROLE_KEY` | the service_role JWT | **Server only.** Bypasses RLS. Never expose |
| `NEXT_PUBLIC_SITE_URL` | `https://sportsconnect.ae` | Must be the real origin: auth redirects, OpenGraph and the sitemap all derive from it |
| `NEXT_PUBLIC_CONSUMER_HOST` | `sportsconnect.ae` | |
| `NEXT_PUBLIC_ORGANIZER_HOST` | `organizer.sportsconnect.ae` | |
| `NEXT_PUBLIC_ADMIN_HOST` | `admin.sportsconnect.ae` | |

`DATABASE_URL` is **not** needed on Vercel. It is only used by the local
`scripts/`, and it points at the pooler:
`postgresql://postgres.ldgymkxdlguowriprxpt:<password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres`

> The direct `db.ldgymkxdlguowriprxpt.supabase.co` host is IPv6-only and will
> time out from most networks. Use the pooler.

## 3. Domains

Add all three to the Vercel project and point them at the same deployment:

- `sportsconnect.ae`
- `organizer.sportsconnect.ae`
- `admin.sportsconnect.ae`

`src/middleware.ts` reads the `Host` header and rewrites onto `/`, `/organizer`
and `/admin`. No separate projects, no separate builds. Preview URLs keep
working because the path prefixes are also routable directly.

## 4. Supabase auth settings

In **Authentication → URL Configuration**:

- **Site URL**: `https://sportsconnect.ae`
- **Redirect URLs**: add
  - `https://sportsconnect.ae/auth/callback`
  - `https://organizer.sportsconnect.ae/auth/callback`
  - `https://admin.sportsconnect.ae/auth/callback`
  - `https://*.vercel.app/auth/callback` for previews

Without these, confirmation and password-reset links bounce.

## 5. Database

The schema is already applied to the live Supabase project. If you ever rebuild
it from scratch:

```bash
npm run db:push        # migrations
npm run db:seed        # sports, formats, fee config, settings
npm run db:users       # one account per role
npm run db:seed-demo   # demo events, optional
```

After any migration, regenerate types and re-run the guards:

```bash
npm run db:types
npm run db:check       # RLS boundaries
npm run db:money       # payment settlement invariant
```

## 6. Before real traffic

- [ ] Rotate the Supabase keys and database password. The current ones were
      pasted into a chat transcript.
- [ ] Change the seeded account passwords, or delete the seed accounts.
- [ ] Replace the placeholder bank details in **Admin → Settings** with the real
      account. They are shown verbatim to every consumer paying by transfer.
- [ ] Confirm whether VAT applies and set `tax_percent` accordingly.
- [ ] Point `support@sportsconnect.ae` and `venues@sportsconnect.ae` somewhere real.
- [ ] Replace the placeholder legal copy in `src/app/legal/[doc]/page.tsx`.
