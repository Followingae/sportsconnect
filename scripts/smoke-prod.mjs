// Probes the live production site and reports what each route actually
// returns, including whether real database content rendered.
const BASE = process.argv[2] ?? "https://www.sportsconnect.ae";

const CHECKS = [
  { path: "/", expect: ["Game On", "Now live in Dubai"], reject: ["Supabase keys are missing"] },
  { path: "/home", expect: ["Browse sports"] },
  { path: "/explore", expect: ["Explore", "Dubai Padel Open"] },
  { path: "/e/dubai-padel-open-2026", expect: ["Register your team", "AED 250", "Glass courts"] },
  { path: "/venues", expect: ["Coming soon"] },
  { path: "/login", expect: ["Welcome back"] },
  { path: "/signup", expect: ["Create your account"] },
  { path: "/legal/terms", expect: ["Terms of use"] },
  { path: "/robots.txt", expect: ["Sitemap"] },
  { path: "/sitemap.xml", expect: ["<loc>"] },
  { path: "/manifest.webmanifest", expect: ["Sportsconnect"] },
  { path: "/icon.svg", expect: ["svg"] },
  { path: "/admin", redirectTo: "/login" },
  { path: "/organizer", redirectTo: "/login" },
];

let failures = 0;

for (const c of CHECKS) {
  try {
    const r = await fetch(BASE + c.path, { redirect: "manual" });
    const loc = r.headers.get("location") ?? "";

    if (c.redirectTo) {
      const ok = r.status >= 300 && r.status < 400 && loc.includes(c.redirectTo);
      if (!ok) failures++;
      console.log(
        `  ${ok ? "PASS" : "FAIL"}  ${c.path.padEnd(26)} ${r.status} -> ${loc || "(none)"}`
      );
      continue;
    }

    if (r.status !== 200) {
      failures++;
      console.log(`  FAIL  ${c.path.padEnd(26)} ${r.status}${loc ? ` -> ${loc}` : ""}`);
      continue;
    }

    const body = await r.text();
    const missing = (c.expect ?? []).filter((s) => !body.includes(s));
    const bad = (c.reject ?? []).filter((s) => body.includes(s));

    if (missing.length || bad.length) {
      failures++;
      console.log(
        `  FAIL  ${c.path.padEnd(26)} 200  missing=[${missing.join(", ")}]` +
          (bad.length ? ` unexpected=[${bad.join(", ")}]` : "")
      );
    } else {
      console.log(`  PASS  ${c.path.padEnd(26)} 200`);
    }
  } catch (err) {
    failures++;
    console.log(`  FAIL  ${c.path.padEnd(26)} ${err.message}`);
  }
}

console.log(
  failures === 0
    ? `\nAll ${CHECKS.length} production checks passed against ${BASE}`
    : `\n${failures} of ${CHECKS.length} FAILED against ${BASE}`
);
process.exit(failures === 0 ? 0 : 1);
