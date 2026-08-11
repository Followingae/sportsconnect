// Uploads the six branded auth email templates to Supabase.
//
// Needs a Supabase *personal access token* (starts with `sbp_`) from
// https://supabase.com/dashboard/account/tokens — project API keys cannot
// change project configuration.
//
//   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/supabase-email-templates.mjs
//
// WARNING — /config/auth treats smtp_* as one group. PATCHing a single SMTP
// field (say smtp_admin_email on its own) clears host, port, user and pass,
// and the project silently falls back to Supabase's built-in mailer, which is
// capped at 2 emails per hour. Always send the whole SMTP block together.
// smtp_pass also reads back hashed, so never echo the GET value into a PATCH.
//
// Template content propagates to the mailer more slowly than subjects — allow
// a few minutes before concluding a template did not apply.
import { readFileSync } from "node:fs";

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF ?? "ldgymkxdlguowriprxpt";

if (!TOKEN) {
  console.error(
    "SUPABASE_ACCESS_TOKEN is not set.\n" +
      "  $env:SUPABASE_ACCESS_TOKEN='sbp_...'; node scripts/supabase-email-templates.mjs"
  );
  process.exit(1);
}

// file → the config key pair Supabase stores each template under.
const TEMPLATES = [
  ["confirm-signup", "confirmation", "Confirm your email"],
  ["reset-password", "recovery", "Reset your password"],
  ["magic-link", "magic_link", "Your sign-in link"],
  ["invite", "invite", "You have been invited to Sportsconnect"],
  ["change-email", "email_change", "Confirm your new email address"],
  ["reauthentication", "reauthentication", "Your verification code"],
];

const api = async (path, init = {}) => {
  const r = await fetch(`https://api.supabase.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const text = await r.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: r.status, body };
};

const payload = {};
for (const [file, key, subject] of TEMPLATES) {
  const html = readFileSync(`supabase/email-templates/${file}.html`, "utf8");
  payload[`mailer_templates_${key}_content`] = html;
  payload[`mailer_subjects_${key}`] = subject;
  console.log(`  ${file.padEnd(18)} -> ${key.padEnd(16)} ${html.length} bytes`);
}

const patch = await api(`/v1/projects/${REF}/config/auth`, {
  method: "PATCH",
  body: JSON.stringify(payload),
});

if (patch.status !== 200) {
  console.error(`\nPATCH failed: ${patch.status}`, patch.body);
  process.exit(1);
}

// Read back and confirm each template actually landed.
const after = await api(`/v1/projects/${REF}/config/auth`);
let bad = 0;
console.log("");
for (const [file, key] of TEMPLATES) {
  const live = after.body[`mailer_templates_${key}_content`] ?? "";
  const want = readFileSync(`supabase/email-templates/${file}.html`, "utf8");
  const ok = live.trim() === want.trim();
  if (!ok) bad++;
  console.log(`  ${ok ? "OK  " : "FAIL"} ${key}`);
}

console.log(bad ? `\n${bad} template(s) did not stick.` : "\nAll six templates are live.");
process.exit(bad ? 1 : 0);
