// Repairs the Vercel project configuration:
//   1. framework -> nextjs   (without it Vercel serves the build as static
//      files and every route 404s)
//   2. the environment variables the app needs at build and runtime
//   3. triggers a fresh production deployment
import { readFileSync } from "node:fs";

const TOKEN = process.env.VERCEL_TOKEN;
if (!TOKEN) {
  console.error("Set VERCEL_TOKEN.");
  process.exit(1);
}

const api = async (path, init = {}) => {
  const r = await fetch(`https://api.vercel.com${path}`, {
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

// Read the local .env.local so the deployed values match what was tested.
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.trim() && !l.trim().startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const { body: projects } = await api("/v9/projects?limit=20");
const project = projects.projects?.find((p) => p.name === "sportsconnect");
if (!project) {
  console.error("Project 'sportsconnect' not found.");
  process.exit(1);
}
console.log(`Project ${project.name} (${project.id})`);

// --- 1. framework ------------------------------------------------------------
const patch = await api(`/v9/projects/${project.id}`, {
  method: "PATCH",
  body: JSON.stringify({ framework: "nextjs" }),
});
console.log(
  patch.status === 200
    ? `  framework -> ${patch.body.framework}`
    : `  framework PATCH failed: ${patch.status} ${JSON.stringify(patch.body)}`
);

// --- 2. environment variables ------------------------------------------------
// The production site answers on www; the apex redirects to it, so the
// canonical origin used for auth redirects and OpenGraph must be www.
const SITE = "https://www.sportsconnect.ae";

const VARS = [
  ["NEXT_PUBLIC_SUPABASE_URL", env.NEXT_PUBLIC_SUPABASE_URL, "plain"],
  ["NEXT_PUBLIC_SUPABASE_ANON_KEY", env.NEXT_PUBLIC_SUPABASE_ANON_KEY, "plain"],
  ["SUPABASE_SERVICE_ROLE_KEY", env.SUPABASE_SERVICE_ROLE_KEY, "encrypted"],
  ["NEXT_PUBLIC_SITE_URL", SITE, "plain"],
  ["NEXT_PUBLIC_CONSUMER_HOST", "www.sportsconnect.ae", "plain"],
  ["NEXT_PUBLIC_ORGANIZER_HOST", "organizer.sportsconnect.ae", "plain"],
  ["NEXT_PUBLIC_ADMIN_HOST", "admin.sportsconnect.ae", "plain"],
];

const { body: existing } = await api(`/v9/projects/${project.id}/env`);
const have = new Map((existing.envs ?? []).map((e) => [e.key, e.id]));

for (const [key, value, type] of VARS) {
  if (!value) {
    console.log(`  ${key}: SKIPPED (no local value)`);
    continue;
  }
  // Replace rather than duplicate if it already exists.
  if (have.has(key)) {
    await api(`/v9/projects/${project.id}/env/${have.get(key)}`, { method: "DELETE" });
  }
  const res = await api(`/v10/projects/${project.id}/env`, {
    method: "POST",
    body: JSON.stringify({
      key,
      value,
      type,
      target: ["production", "preview", "development"],
    }),
  });
  console.log(
    res.status < 300
      ? `  env ${key} set`
      : `  env ${key} FAILED: ${res.status} ${JSON.stringify(res.body).slice(0, 160)}`
  );
}

// --- 3. redeploy -------------------------------------------------------------
const { body: deps } = await api(`/v6/deployments?projectId=${project.id}&limit=1`);
const latest = deps.deployments?.[0];
if (!latest) {
  console.log("\nNo previous deployment to redeploy from. Push a commit to trigger one.");
  process.exit(0);
}

const redeploy = await api(`/v13/deployments?forceNew=1`, {
  method: "POST",
  body: JSON.stringify({
    name: project.name,
    project: project.id,
    target: "production",
    gitSource: {
      type: "github",
      org: project.link?.org,
      repo: project.link?.repo,
      ref: "main",
    },
  }),
});

console.log(
  redeploy.status < 300
    ? `\nTriggered production deploy: ${redeploy.body.url}`
    : `\nRedeploy failed: ${redeploy.status} ${JSON.stringify(redeploy.body).slice(0, 300)}`
);
