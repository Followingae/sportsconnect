// Why is a verified domain 404ing? Inspect aliases, domain config and the
// deployment the domain actually points at.
const TOKEN = process.env.VERCEL_TOKEN;
const api = async (p, init) => {
  const r = await fetch(`https://api.vercel.com${p}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
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
console.log(`project ${project.id}`);
console.log(`  productionBranch: ${project.link?.productionBranch}`);
console.log(`  publicSource:     ${project.publicSource}`);
console.log(`  ssoProtection:    ${JSON.stringify(project.ssoProtection)}`);
console.log(`  passwordProtect:  ${JSON.stringify(project.passwordProtection)}`);
console.log(`  latest prod alias:${JSON.stringify(project.targets?.production?.alias ?? null)}`);
console.log(`  latest prod state:${project.targets?.production?.readyState}`);
console.log(`  latest prod id:   ${project.targets?.production?.id}`);

console.log("\n--- project domains ---");
const { body: doms } = await api(`/v9/projects/${project.id}/domains`);
for (const d of doms.domains ?? []) {
  console.log(
    `  ${d.name}\n    verified=${d.verified} redirect=${d.redirect ?? "-"} ` +
      `gitBranch=${d.gitBranch ?? "-"} apexName=${d.apexName}`
  );
}

console.log("\n--- account-level domain records ---");
for (const name of ["sportsconnect.ae", "www.sportsconnect.ae"]) {
  const { status, body } = await api(`/v5/domains/${name}`);
  if (status !== 200) {
    console.log(`  ${name}: ${status} ${JSON.stringify(body).slice(0, 140)}`);
    continue;
  }
  const d = body.domain ?? body;
  console.log(
    `  ${name}: verified=${d.verified} nameservers=${JSON.stringify(d.nameservers)} ` +
      `intendedNs=${JSON.stringify(d.intendedNameservers)?.slice(0, 90)}`
  );
}

console.log("\n--- aliases on the newest production deployment ---");
const { body: deps } = await api(
  `/v6/deployments?projectId=${project.id}&limit=3&target=production`
);
for (const d of deps.deployments ?? []) {
  const { body: detail } = await api(`/v13/deployments/${d.uid}`);
  console.log(
    `  ${d.uid} ${d.readyState}\n    url=${detail.url}\n    alias=${JSON.stringify(detail.alias)}\n    aliasAssigned=${detail.aliasAssigned} aliasError=${JSON.stringify(detail.aliasError)}`
  );
}
