// Diagnoses a Vercel deployment: project config, latest deployments, domains,
// env vars present, and the tail of the build log for any failure.
const TOKEN = process.env.VERCEL_TOKEN;
if (!TOKEN) {
  console.error("Set VERCEL_TOKEN first.");
  process.exit(1);
}

const api = async (path) => {
  const r = await fetch(`https://api.vercel.com${path}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  const text = await r.text();
  try {
    return { status: r.status, body: JSON.parse(text) };
  } catch {
    return { status: r.status, body: text };
  }
};

const { status, body: projects } = await api("/v9/projects?limit=20");
if (status !== 200) {
  console.error("Projects call failed:", status, projects);
  process.exit(1);
}

console.log(`Projects (${projects.projects?.length ?? 0}):`);
for (const p of projects.projects ?? []) {
  console.log(`  ${p.name}  id=${p.id}`);
  console.log(`    framework:     ${p.framework ?? "(none detected)"}`);
  console.log(`    rootDirectory: ${p.rootDirectory ?? "(repo root)"}`);
  console.log(`    buildCommand:  ${p.buildCommand ?? "(default)"}`);
  console.log(`    outputDir:     ${p.outputDirectory ?? "(default)"}`);
  console.log(`    installCmd:    ${p.installCommand ?? "(default)"}`);
  console.log(`    nodeVersion:   ${p.nodeVersion ?? "(default)"}`);
  const repo = p.link
    ? `${p.link.type}:${p.link.org}/${p.link.repo} (branch ${p.link.productionBranch ?? "?"})`
    : "(not linked to a repo)";
  console.log(`    repo:          ${repo}`);
}

for (const p of projects.projects ?? []) {
  console.log(`\n================ ${p.name} ================`);

  const { body: envs } = await api(`/v9/projects/${p.id}/env`);
  const keys = (envs.envs ?? []).map((e) => `${e.key}[${e.target?.join(",")}]`);
  console.log(`env vars (${keys.length}):`);
  console.log(keys.length ? `  ${keys.join("\n  ")}` : "  NONE SET");

  const required = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SITE_URL",
  ];
  const have = new Set((envs.envs ?? []).map((e) => e.key));
  const missing = required.filter((k) => !have.has(k));
  console.log(missing.length ? `  MISSING: ${missing.join(", ")}` : "  all required keys present");

  const { body: doms } = await api(`/v9/projects/${p.id}/domains`);
  console.log(`domains (${doms.domains?.length ?? 0}):`);
  for (const d of doms.domains ?? []) {
    console.log(`  ${d.name}  verified=${d.verified}  redirect=${d.redirect ?? "-"}`);
  }

  const { body: deps } = await api(`/v6/deployments?projectId=${p.id}&limit=5`);
  console.log(`deployments (${deps.deployments?.length ?? 0}):`);
  for (const d of deps.deployments ?? []) {
    console.log(
      `  ${new Date(d.created).toISOString()}  state=${d.readyState}  target=${d.target ?? "preview"}  ${d.url}`
    );
  }

  const latest = deps.deployments?.[0];
  if (latest && latest.readyState !== "READY") {
    console.log(`\n--- build log tail for ${latest.uid} (${latest.readyState}) ---`);
    const { body: events } = await api(`/v2/deployments/${latest.uid}/events?limit=60`);
    const lines = Array.isArray(events) ? events : [];
    for (const e of lines.slice(-40)) {
      const t = e.payload?.text ?? e.text ?? "";
      if (t.trim()) console.log(`  ${t.replace(/\n$/, "")}`);
    }
  }
}
