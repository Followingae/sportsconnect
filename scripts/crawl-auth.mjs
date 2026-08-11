// Signs in as each seeded role and requests every route, reporting any that
// return 5xx or render Next's "Application error" client fallback.
//
//   node scripts/crawl-auth.mjs                  against production
//   node scripts/crawl-auth.mjs http://localhost:3000
//
// The session cookies are produced by @supabase/ssr itself via its setAll
// hook, so they are byte-identical to what a real browser would hold.
import { createServerClient } from "@supabase/ssr";
import { readFileSync } from "node:fs";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

/** Real ids so the [id] / [slug] routes are exercised, not just the lists. */
async function sampleIds() {
  const db = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();
  const one = async (sql) => (await db.query(sql)).rows[0] ?? {};
  const ids = {
    event: (await one("select id from events order by created_at limit 1")).id,
    pending: (
      await one(
        `select id from events
          where status in ('submitted','under_review','changes_requested')
          limit 1`
      )
    ).id,
    consumer: (await one("select id from profiles where role = 'consumer' limit 1")).id,
    slug: (
      await one(
        "select slug from events where status not in ('draft') and slug is not null limit 1"
      )
    ).slug,
  };
  await db.end();
  return ids;
}

const ids = await sampleIds();
const dyn = (list) => list.filter((p) => !p.includes("undefined"));

const BASE = process.argv[2] ?? "https://www.sportsconnect.ae";
const { accounts } = JSON.parse(readFileSync("credentials.json", "utf8"));

const CONSUMER = [
  "/", "/home", "/explore", "/my-events", "/payments", "/profile",
  "/notifications", "/venues", "/login", "/signup", "/no-access",
  "/legal/terms", "/legal/privacy",
  ...dyn([`/e/${ids.slug}`, `/e/${ids.slug}/register`, `/e/${ids.slug}/notify`]),
];

const ORGANIZER = [
  "/organizer", "/organizer/events", "/organizer/events/new",
  "/organizer/participants", "/organizer/teams", "/organizer/payments",
  "/organizer/messages", "/organizer/reports",
  ...dyn([
    `/organizer/events/${ids.event}`,
    `/organizer/events/${ids.event}/edit`,
    `/organizer/events/${ids.event}/participants`,
    `/organizer/events/${ids.event}/teams`,
    `/organizer/events/${ids.event}/payments`,
    `/organizer/events/${ids.event}/messages`,
  ]),
];

const ADMIN = [
  "/admin", "/admin/approvals", "/admin/events", "/admin/sports",
  "/admin/venues", "/admin/event-admins", "/admin/consumers",
  "/admin/payments", "/admin/refunds", "/admin/discounts",
  "/admin/reports", "/admin/moderation", "/admin/audit", "/admin/settings",
  ...dyn([`/admin/approvals/${ids.pending}`, `/admin/consumers/${ids.consumer}`]),
];

/** Sign in and return the Cookie header a browser would send. */
async function cookiesFor(email, password) {
  const jar = new Map();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (list) => list.forEach((c) => jar.set(c.name, c.value)),
      },
    }
  );
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return [...jar].map(([n, v]) => `${n}=${v}`).join("; ");
}

/** Follow redirects manually so we can report the whole chain. */
async function visit(path, cookie) {
  let url = BASE + path;
  const chain = [];
  for (let hop = 0; hop < 6; hop++) {
    const res = await fetch(url, { headers: { cookie }, redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      chain.push(res.status);
      url = new URL(loc, url).toString();
      continue;
    }
    const body = await res.text();
    // A server component that throws still returns 200 with the client-side
    // error fallback baked into the payload, so status alone is not enough.
    const crashed =
      body.includes("a server-side exception has occurred") ||
      body.includes("Application error:");
    return { status: res.status, chain, crashed, url, body };
  }
  return { status: 310, chain, crashed: true, url, body: "redirect loop" };
}

let failures = 0;

for (const { role, email, password } of accounts) {
  const paths =
    role === "super_admin"
      ? [...CONSUMER, ...ORGANIZER, ...ADMIN]
      : role === "event_admin"
        ? [...CONSUMER, ...ORGANIZER]
        : CONSUMER;

  const cookie = await cookiesFor(email, password);
  console.log(`\n=== ${role} (${email}) — ${paths.length} routes ===`);

  for (const path of paths) {
    const r = await visit(path, cookie);
    const bad = r.crashed || r.status >= 500;
    if (bad) failures++;
    const hops = r.chain.length ? ` [${r.chain.join("->")}]` : "";
    console.log(
      `  ${bad ? "FAIL" : "ok  "} ${path.padEnd(28)} ${r.status}${hops}` +
        (bad ? `  ${r.crashed ? "server-side exception" : "server error"}` : "")
    );
  }
}

console.log(failures ? `\n${failures} broken route(s).` : "\nAll routes render.");
process.exit(failures ? 1 : 0);
