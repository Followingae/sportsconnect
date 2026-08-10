// Creates one pre-confirmed account per role so all three portals can be
// signed into immediately. Idempotent. Development convenience only —
// never run this against production.
import { createClient } from "@supabase/supabase-js";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "Sportsconnect2026!";

const USERS = [
  {
    email: "admin@sportsconnect.ae",
    full_name: "Rana Haddad",
    role: "super_admin",
    phone: "+971 50 000 0001",
  },
  {
    email: "organizer@sportsconnect.ae",
    full_name: "Omar Haddad",
    role: "event_admin",
    phone: "+971 50 000 0002",
    organization: "Padel Pro",
  },
  {
    email: "player@sportsconnect.ae",
    full_name: "Zak Rahman",
    role: "consumer",
    phone: "+971 50 123 4567",
  },
];

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

for (const u of USERS) {
  // listUsers has no email filter in v2, so look the id up in our own table.
  const { rows: existing } = await client.query(
    "select id from profiles where email = $1",
    [u.email]
  );

  let id = existing[0]?.id;

  if (!id) {
    const { data, error } = await admin.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true, // skip the verification email for seed accounts
      user_metadata: { full_name: u.full_name, phone: u.phone, role: u.role },
    });
    if (error) {
      console.error(`FAILED ${u.email}: ${error.message}`);
      continue;
    }
    id = data.user.id;
    console.log(`created  ${u.email}`);
  } else {
    await admin.auth.admin.updateUserById(id, { password: PASSWORD });
    console.log(`exists   ${u.email} (password reset)`);
  }

  // The handle_new_user trigger sets role from metadata, but reassert it so
  // re-runs after a role change still converge.
  await client.query(
    `update profiles
       set role = $2::user_role, full_name = $3, phone = $4, status = 'active'
     where id = $1`,
    [id, u.role, u.full_name, u.phone]
  );

  if (u.role === "event_admin") {
    const { rows: org } = await client.query(
      `insert into organizations (name, contact_email)
       values ($1, $2)
       on conflict do nothing
       returning id`,
      [u.organization, u.email]
    );
    const orgId =
      org[0]?.id ??
      (await client.query("select id from organizations where name = $1", [u.organization]))
        .rows[0]?.id;

    await client.query(
      `insert into event_admin_profiles (user_id, organization_id, title)
       values ($1, $2, 'Event Admin')
       on conflict (user_id) do update set organization_id = excluded.organization_id`,
      [id, orgId]
    );

    // Grant the default permission set (BRD §4.2 — configurable, not hard-coded).
    const defaults = [
      "create_event",
      "edit_event",
      "submit_event",
      "manage_participants",
      "add_remove_participants",
      "manage_teams",
      "view_registrations",
      "manage_content",
    ];
    for (const p of defaults) {
      await client.query(
        `insert into event_admin_permissions (user_id, permission)
         values ($1, $2) on conflict do nothing`,
        [id, p]
      );
    }
  }
}

const { rows } = await client.query(
  "select email, role, status from profiles order by role"
);
console.log("\nAccounts:");
for (const r of rows) console.log(`  ${r.role.padEnd(12)} ${r.email}  (${r.status})`);
console.log(`\nPassword for all: ${PASSWORD}`);

await client.end();
