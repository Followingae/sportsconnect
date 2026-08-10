// Waits for the newest production deployment to finish, then probes the live
// site. Prints the build log tail if it fails.
const TOKEN = process.env.VERCEL_TOKEN;
const api = async (p) => {
  const r = await fetch(`https://api.vercel.com${p}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  return r.json();
};

const projects = await api("/v9/projects?limit=20");
const project = projects.projects.find((p) => p.name === "sportsconnect");

let deployment;
for (let i = 0; i < 90; i++) {
  const deps = await api(`/v6/deployments?projectId=${project.id}&limit=1&target=production`);
  deployment = deps.deployments?.[0];
  if (!deployment) break;
  process.stdout.write(`\r  ${deployment.readyState}  (${i * 5}s)      `);
  if (["READY", "ERROR", "CANCELED"].includes(deployment.readyState)) break;
  await new Promise((r) => setTimeout(r, 5000));
}
console.log("");

if (!deployment) {
  console.error("No production deployment found.");
  process.exit(1);
}
console.log(`\nDeployment ${deployment.uid}: ${deployment.readyState}`);
console.log(`  ${deployment.url}`);

if (deployment.readyState !== "READY") {
  const events = await api(`/v2/deployments/${deployment.uid}/events?limit=100`);
  console.log("\n--- build log tail ---");
  for (const e of (Array.isArray(events) ? events : []).slice(-45)) {
    const t = e.payload?.text ?? e.text ?? "";
    if (t.trim()) console.log(`  ${t.replace(/\n$/, "")}`);
  }
  process.exit(1);
}

// --- probe the live site -----------------------------------------------------
const targets = [
  "https://www.sportsconnect.ae",
  "https://sportsconnect.ae",
  `https://${deployment.url}`,
];

for (const base of targets) {
  console.log(`\n=== ${base} ===`);
  for (const path of ["/", "/explore", "/e/dubai-padel-open-2026", "/admin", "/robots.txt"]) {
    try {
      const r = await fetch(base + path, { redirect: "manual" });
      const loc = r.headers.get("location");
      let extra = "";
      if (r.status === 200 && path === "/") {
        const html = await r.text();
        const title = html.match(/<title>([^<]*)<\/title>/)?.[1] ?? "";
        const live = /Game On/.test(html);
        const setup = /Supabase keys are missing/.test(html);
        extra = `  title="${title}"${live ? " [landing OK]" : ""}${setup ? " [NO ENV VARS]" : ""}`;
      }
      console.log(`  ${path.padEnd(28)} ${r.status}${loc ? ` -> ${loc}` : ""}${extra}`);
    } catch (err) {
      console.log(`  ${path.padEnd(28)} ERROR ${err.message}`);
    }
  }
}
