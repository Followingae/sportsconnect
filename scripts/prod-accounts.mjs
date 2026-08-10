// Production hardening for the demo accounts.
//
// The seed data stays (the client wants a populated demo), but the accounts
// must not ship with a shared, guessable password. This gives each role its
// own strong random password, normalises names, and writes the credentials to
// credentials.json for the branded PDF. That file is gitignored.
import { writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await db.connect();

/**
 * Readable but strong: 4 words from a small list, a number and a symbol.
 * Someone has to type these off a PDF, so avoid ambiguous characters and
 * anything that needs a modifier key twice.
 */
const WORDS = [
  "padel", "court", "rally", "match", "squad", "league", "volley", "smash",
  "pitch", "serve", "final", "coach", "sprint", "anchor", "summit", "harbor",
  "cobalt", "ember", "falcon", "granite", "indigo", "juniper", "kestrel", "lumen",
];

function password() {
  const pick = () => WORDS[randomBytes(1)[0] % WORDS.length];
  const cap = (w) => w[0].toUpperCase() + w.slice(1);
  const n = 100 + (randomBytes(2).readUInt16BE(0) % 900);
  return `${cap(pick())}-${pick()}-${pick()}-${n}`;
}

const ACCOUNTS = [
  {
    role: "super_admin",
    label: "Super Admin",
    email: "admin@sportsconnect.ae",
    full_name: "Rana Haddad",
    lands: "admin.sportsconnect.ae",
    can: "Approve events, reconcile payments, decide refunds, manage admins and consumers, configure the platform.",
  },
  {
    role: "event_admin",
    label: "Event Admin",
    email: "organizer@sportsconnect.ae",
    full_name: "Omar Haddad",
    lands: "organizer.sportsconnect.ae",
    can: "Build events, submit for approval, manage participants and teams, record cash, message participants.",
  },
  {
    role: "consumer",
    label: "Consumer",
    email: "player@sportsconnect.ae",
    full_name: "John Doe",
    lands: "www.sportsconnect.ae",
    can: "Browse and register for events, pay by transfer or cash, manage registrations and receipts.",
  },
];

const issued = [];

for (const a of ACCOUNTS) {
  const { rows } = await db.query("select id from profiles where email = $1", [a.email]);
  if (rows.length === 0) {
    console.error(`  MISSING ${a.email} — run npm run db:users first`);
    continue;
  }
  const id = rows[0].id;
  const pw = password();

  const { error } = await admin.auth.admin.updateUserById(id, {
    password: pw,
    email_confirm: true,
    user_metadata: { full_name: a.full_name, role: a.role },
  });
  if (error) {
    console.error(`  FAILED ${a.email}: ${error.message}`);
    continue;
  }

  await db.query(
    "update profiles set full_name = $2, status = 'active' where id = $1",
    [id, a.full_name]
  );

  issued.push({ ...a, password: pw });
  console.log(`  ${a.label.padEnd(12)} ${a.email.padEnd(30)} rotated`);
}

// Any other name that leaked into demo content.
const renamed = await db.query(
  `update registrations set participant_name = 'John Doe'
   where participant_name ilike '%zak%' or participant_name ilike '%rahman%'`
);
if (renamed.rowCount > 0) console.log(`  renamed ${renamed.rowCount} registration(s)`);

writeFileSync(
  "credentials.json",
  JSON.stringify({ generated: new Date().toISOString(), accounts: issued }, null, 2)
);

console.log(`\n${issued.length} account(s) hardened. Credentials written to credentials.json`);
await db.end();
