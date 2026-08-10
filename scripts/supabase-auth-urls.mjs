// Points Supabase Auth at the real site instead of localhost.
//
// Confirmation and password-reset links are built as
//   {project}/auth/v1/verify?...&redirect_to={emailRedirectTo}
// and Supabase silently falls back to SITE_URL when emailRedirectTo is not in
// the allowlist. If SITE_URL is still http://localhost:3000, every email in
// production sends people to their own machine.
//
// This needs a Supabase *personal access token* (starts with `sbp_`), created
// at https://supabase.com/dashboard/account/tokens — the anon and service_role
// keys cannot change project configuration.
//
//   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/supabase-auth-urls.mjs

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF ?? "ldgymkxdlguowriprxpt";

if (!TOKEN) {
  console.error(
    "SUPABASE_ACCESS_TOKEN is not set.\n" +
      "Create one at https://supabase.com/dashboard/account/tokens, then re-run:\n" +
      "  $env:SUPABASE_ACCESS_TOKEN='sbp_...'; node scripts/supabase-auth-urls.mjs"
  );
  process.exit(1);
}

const SITE = "https://www.sportsconnect.ae";

const REDIRECTS = [
  `${SITE}/auth/callback`,
  `${SITE}/**`,
  "https://sportsconnect.ae/auth/callback",
  "https://organizer.sportsconnect.ae/auth/callback",
  "https://organizer.sportsconnect.ae/**",
  "https://admin.sportsconnect.ae/auth/callback",
  "https://admin.sportsconnect.ae/**",
  // Vercel preview deployments.
  "https://*-sports-connect1.vercel.app/**",
  "https://sportsconnect-two.vercel.app/**",
  // Local development.
  "http://localhost:3000/**",
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

const before = await api(`/v1/projects/${REF}/config/auth`);
if (before.status !== 200) {
  console.error(`Could not read auth config: ${before.status}`, before.body);
  process.exit(1);
}

console.log("current:");
console.log(`  SITE_URL          ${before.body.site_url}`);
console.log(`  URI_ALLOW_LIST    ${before.body.uri_allow_list}`);

const patch = await api(`/v1/projects/${REF}/config/auth`, {
  method: "PATCH",
  body: JSON.stringify({
    site_url: SITE,
    uri_allow_list: REDIRECTS.join(","),
    mailer_autoconfirm: false,
    // Stay signed in: no hard session timebox, no inactivity logout. The
    // refresh token keeps working until the user signs out, and the browser
    // cookie is set to 400 days (see lib/supabase/session.ts).
    sessions_timebox: 0,
    sessions_inactivity_timeout: 0,
    refresh_token_rotation_enabled: true,
    security_refresh_token_reuse_interval: 10,
  }),
});

if (patch.status !== 200) {
  console.error(`\nPATCH failed: ${patch.status}`, patch.body);
  process.exit(1);
}

const after = await api(`/v1/projects/${REF}/config/auth`);
console.log("\nupdated:");
console.log(`  SITE_URL          ${after.body.site_url}`);
console.log(`  URI_ALLOW_LIST    ${after.body.uri_allow_list}`);
console.log("\nConfirmation and reset emails now point at the live site.");
