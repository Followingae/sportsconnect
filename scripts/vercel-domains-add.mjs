// Adds the two portal subdomains to the Vercel project so the middleware's
// host-based routing works on real hostnames, not just /organizer and /admin.
const TOKEN = process.env.VERCEL_TOKEN;
const api = async (p, init = {}) => {
  const r = await fetch(`https://api.vercel.com${p}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const t = await r.text();
  try {
    return { status: r.status, body: JSON.parse(t) };
  } catch {
    return { status: r.status, body: t };
  }
};

const { body: projects } = await api("/v9/projects?limit=20");
const project = projects.projects.find((p) => p.name === "sportsconnect");

for (const name of ["organizer.sportsconnect.ae", "admin.sportsconnect.ae"]) {
  const res = await api(`/v10/projects/${project.id}/domains`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });

  if (res.status < 300) {
    console.log(`  added ${name}`);
  } else if (JSON.stringify(res.body).includes("domain_already_in_use")) {
    console.log(`  ${name} already attached`);
  } else {
    console.log(`  ${name} FAILED ${res.status}: ${JSON.stringify(res.body).slice(0, 200)}`);
  }
}

console.log("\n--- DNS each subdomain needs ---");
const { body: doms } = await api(`/v9/projects/${project.id}/domains`);
for (const d of doms.domains ?? []) {
  if (!d.name.endsWith("sportsconnect.ae")) continue;
  const { body: cfg } = await api(`/v6/domains/${d.name}/config`);
  console.log(
    `  ${d.name.padEnd(32)} verified=${d.verified} misconfigured=${cfg.misconfigured}`
  );
  if (cfg.misconfigured) {
    console.log(`      add CNAME -> cname.vercel-dns.com`);
  }
}
