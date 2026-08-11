// End-to-end behavioural QA against the live database, as real signed-in
// users. Complements rls-check.mjs (which only covers reads) by exercising
// the write paths each role actually performs, plus the negative cases that
// must stay blocked.
//
// Every row it creates is cleaned up with the service key at the end.
//
//   node scripts/qa-flows.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY;
const { accounts } = JSON.parse(readFileSync("credentials.json", "utf8"));

const admin = createClient(URL, SVC, { auth: { persistSession: false } });
const made = { registrations: [], teams: [], payments: [] };

let pass = 0;
let fail = 0;

let skipped = 0;
function skip(what) {
  skipped++;
  console.log(`  SKIP  no fixture: ${what}`);
}

function check(label, ok, detail = "") {
  if (ok) {
    pass++;
    console.log(`  ok    ${label}`);
  } else {
    fail++;
    console.log(`  FAIL  ${label}${detail ? `  — ${detail}` : ""}`);
  }
}

async function signIn(role) {
  const a = accounts.find((x) => x.role === role);
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { data, error } = await c.auth.signInWithPassword({
    email: a.email,
    password: a.password,
  });
  if (error) throw new Error(`${role} sign-in failed: ${error.message}`);
  return { client: c, user: data.user };
}

const rnd = () => Math.random().toString(36).slice(2, 8);

// --- consumer: the full team-registration write path -------------------------

async function consumerTeamRegistration() {
  console.log("\n=== consumer: team registration write path ===");
  const { client: sb, user } = await signIn("consumer");

  const { data: event } = await sb
    .from("events")
    .select("id, currency, registration_model, status")
    .eq("registration_model", "team")
    .eq("status", "registration_open")
    .limit(1)
    .single();

  if (!event) return check("a team event is open for registration", false);

  const { data: team, error: teamErr } = await sb
    .from("teams")
    .insert({ event_id: event.id, name: `QA Team ${rnd()}`, created_by: user.id })
    .select("id")
    .single();
  check("captain can create their team", !teamErr, teamErr?.message);
  if (teamErr) return;
  made.teams.push(team.id);

  // Rollback first: registrations_one_live_per_user (correctly) forbids a
  // second live registration on the same event, so this cannot run after the
  // captain row exists.
  const { data: tmpReg, error: tmpErr } = await sb
    .from("registrations")
    .insert({
      event_id: event.id,
      user_id: user.id,
      participant_name: "QA Rollback",
      role: "player",
      status: "pending",
      source: "online",
    })
    .select("id")
    .single();

  if (!tmpReg) {
    check("rollback fixture could be created", false, tmpErr?.message);
  } else {
    const { error: delErr } = await sb.from("registrations").delete().eq("id", tmpReg.id);
    const { data: still } = await admin
      .from("registrations")
      .select("id")
      .eq("id", tmpReg.id)
      .maybeSingle();
    check("rollback can delete an unpaid registration", !delErr && !still, delErr?.message);
    if (still) made.registrations.push(tmpReg.id);
  }

  const { data: reg, error: regErr } = await sb
    .from("registrations")
    .insert({
      event_id: event.id,
      user_id: user.id,
      team_id: team.id,
      participant_name: "QA Captain",
      role: "captain",
      is_captain: true,
      status: "pending",
      source: "online",
    })
    .select("id")
    .single();
  check("captain can create their registration", !regErr, regErr?.message);
  if (regErr) return;
  made.registrations.push(reg.id);

  const { error: squadErr } = await sb.from("registrations").insert([
    {
      event_id: event.id,
      team_id: team.id,
      participant_name: "QA Squad Member",
      role: "player",
      status: "pending",
      source: "online",
      created_by: user.id,
    },
  ]);
  check("captain can add named squad members", !squadErr, squadErr?.message);

  const { error: payErr } = await sb.from("payments").insert({
    registration_id: reg.id,
    event_id: event.id,
    reference_code: `QA-${rnd().toUpperCase()}`,
    subtotal_amount: 100,
    discount_amount: 0,
    platform_fee_amount: 5,
    tax_amount: 0,
    total_amount: 105,
    currency: event.currency,
    method: "bank_transfer",
    status: "pending",
  });
  check("consumer can raise their pending payment", !payErr, payErr?.message);

}

// --- consumer: things that must stay blocked ---------------------------------

async function consumerMustNotBeAbleTo() {
  console.log("\n=== consumer: negative security checks ===");
  const { client: sb, user } = await signIn("consumer");

  // Build a registration owned by somebody else, so the isolation checks below
  // always run rather than quietly skipping.
  const other = accounts.find((a) => a.role === "event_admin");
  const { data: otherUser } = await admin
    .from("profiles")
    .select("id")
    .eq("email", other.email)
    .single();

  const { data: openEvent } = await admin
    .from("events")
    .select("id")
    .eq("status", "registration_open")
    .limit(1)
    .single();

  const { data: someone } = await admin
    .from("registrations")
    .insert({
      event_id: openEvent.id,
      user_id: otherUser.id,
      participant_name: "QA Someone Else",
      role: "player",
      status: "pending",
      source: "online",
    })
    .select("id, event_id")
    .single();

  if (!someone) skip("another person’s registration exists to test against");
  if (someone) {
    const { data: seen } = await sb
      .from("registrations")
      .select("id")
      .eq("id", someone.id)
      .maybeSingle();
    check("cannot read another person's registration", !seen);

    const { error: delErr } = await sb.from("registrations").delete().eq("id", someone.id);
    const { data: survived } = await admin
      .from("registrations")
      .select("id")
      .eq("id", someone.id)
      .maybeSingle();
    check("cannot delete another person's registration", Boolean(survived), delErr?.message);
  }

  const { data: otherTeam } = await admin
    .from("teams")
    .select("id, event_id, created_by")
    .neq("created_by", user.id)
    .limit(1)
    .maybeSingle();

  if (!otherTeam) skip("another person’s team exists to test against");
  if (otherTeam) {
    const { error: sqErr } = await sb.from("registrations").insert({
      event_id: otherTeam.event_id,
      team_id: otherTeam.id,
      participant_name: "QA Intruder",
      role: "player",
      status: "pending",
      source: "online",
      created_by: user.id,
    });
    check("cannot inject a player into someone else's team", Boolean(sqErr));
    if (!sqErr) {
      await admin.from("registrations").delete().eq("participant_name", "QA Intruder");
    }
  }

  const { data: pay } = await admin
    .from("payments")
    .select("id")
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();
  if (pay) {
    await sb.from("payments").update({ status: "paid" }).eq("id", pay.id);
    const { data: after } = await admin
      .from("payments")
      .select("status")
      .eq("id", pay.id)
      .single();
    check("cannot mark a payment paid", after.status === "pending", `status=${after.status}`);
  }

  const { error: notifErr } = await sb
    .from("notifications")
    .insert({ user_id: user.id, title: "QA", body: "QA", type: "system" });
  check("cannot forge a notification", Boolean(notifErr));

  const { error: sportErr } = await sb.from("sports").insert({ slug: `qa-${rnd()}`, name: "QA" });
  check("cannot create a sport", Boolean(sportErr));

  const { error: evErr } = await sb
    .from("events")
    .insert({ title: "QA Event", slug: `qa-${rnd()}`, status: "draft" });
  check("cannot create an event", Boolean(evErr));
}

// --- event admin -------------------------------------------------------------

async function eventAdminChecks() {
  console.log("\n=== event admin ===");
  const { client: sb } = await signIn("event_admin");

  const { data: mine } = await sb.from("events").select("id, status").limit(1).maybeSingle();
  check("sees their own events", Boolean(mine));

  const { data: pay } = await admin.from("payments").select("id, status").limit(1).maybeSingle();
  if (pay) {
    await sb.from("payments").update({ status: "paid" }).eq("id", pay.id);
    const { data: after } = await admin
      .from("payments")
      .select("status")
      .eq("id", pay.id)
      .single();
    check(
      "cannot settle a payment (D4: super admin only)",
      after.status === pay.status,
      `was ${pay.status}, now ${after.status}`
    );
  }

  const { error: feeErr } = await sb
    .from("platform_fee_config")
    .insert({ scope: "global", mode: "percentage", percentage: 0, is_active: true });
  check("cannot change the platform fee", Boolean(feeErr));
}

// --- super admin -------------------------------------------------------------

async function superAdminChecks() {
  console.log("\n=== super admin ===");
  const { client: sb } = await signIn("super_admin");

  const { data: profiles } = await sb.from("profiles").select("id");
  check("sees every profile", (profiles?.length ?? 0) >= 3, `${profiles?.length} seen`);

  const { data: pay } = await admin
    .from("payments")
    .select("id, status")
    .eq("status", "pending")
    .limit(1)
    .maybeSingle();

  if (pay) {
    const { error } = await sb.from("payments").update({ status: "paid" }).eq("id", pay.id);
    const { data: after } = await admin
      .from("payments")
      .select("status")
      .eq("id", pay.id)
      .single();
    check("can settle a payment", !error && after.status === "paid", error?.message);
    await admin.from("payments").update({ status: pay.status }).eq("id", pay.id);
  }
}

// --- cleanup -----------------------------------------------------------------

async function cleanup() {
  await admin.from("payments").delete().like("reference_code", "QA-%");
  for (const id of made.registrations) await admin.from("registrations").delete().eq("id", id);
  await admin.from("registrations").delete().in("participant_name", [
    "QA Captain",
    "QA Squad Member",
    "QA Rollback",
    "QA Intruder",
    "QA Someone Else",
  ]);
  for (const id of made.teams) await admin.from("teams").delete().eq("id", id);
  await admin.from("teams").delete().like("name", "QA Team %");
}

try {
  await consumerTeamRegistration();
  await consumerMustNotBeAbleTo();
  await eventAdminChecks();
  await superAdminChecks();
} finally {
  await cleanup();
}

console.log(`\n${pass} passed, ${fail} failed.`);
process.exit(fail ? 1 : 0);
