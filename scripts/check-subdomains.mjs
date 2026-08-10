// Polls the two portal subdomains until DNS resolves and Vercel stops
// reporting them as misconfigured, then confirms they serve.
//
//   node scripts/check-subdomains.mjs          one pass
//   node scripts/check-subdomains.mjs --watch  poll every 30s
import { promises as dns } from "node:dns";

const HOSTS = ["organizer.sportsconnect.ae", "admin.sportsconnect.ae"];
const WATCH = process.argv.includes("--watch");
const TOKEN = process.env.VERCEL_TOKEN;

const api = async (p) =>
  TOKEN
    ? (await fetch("https://api.vercel.com" + p, {
        headers: { Authorization: "Bearer " + TOKEN },
      })).json()
    : null;

async function pass() {
  let allGood = true;

  for (const host of HOSTS) {
    let record = null;
    try {
      const c = await dns.resolveCname(host);
      record = `CNAME ${c[0]}`;
    } catch {
      try {
        const a = await dns.resolve4(host);
        record = `A ${a.join(", ")}`;
      } catch {
        record = null;
      }
    }

    if (!record) {
      allGood = false;
      console.log(`  ${host.padEnd(28)} no DNS record yet`);
      continue;
    }

    const cfg = await api(`/v6/domains/${host}/config`);
    const misconfigured = cfg?.misconfigured;

    let http = "not checked";
    try {
      const r = await fetch(`https://${host}/`, { redirect: "manual" });
      http = `HTTP ${r.status}${r.headers.get("location") ? " -> " + r.headers.get("location") : ""}`;
    } catch (e) {
      http = `unreachable (${e.cause?.code ?? e.message})`;
    }

    const ok = record && misconfigured === false && http.startsWith("HTTP");
    if (!ok) allGood = false;

    console.log(
      `  ${ok ? "OK  " : "WAIT"} ${host.padEnd(28)} ${record.padEnd(34)} ` +
        `vercel=${misconfigured === false ? "configured" : "misconfigured"}  ${http}`
    );
  }

  return allGood;
}

console.log(`Checking ${HOSTS.length} subdomains${WATCH ? " (watching)" : ""}\n`);

if (!WATCH) {
  const ok = await pass();
  console.log(
    ok
      ? "\nBoth subdomains are live."
      : "\nStill waiting on DNS. Add at tasjeel.ae:\n" +
          HOSTS.map((h) => `  CNAME  ${h.split(".")[0].padEnd(12)} -> cname.vercel-dns.com`).join("\n")
  );
  process.exit(ok ? 0 : 1);
}

for (let i = 0; i < 60; i++) {
  console.log(`--- attempt ${i + 1} ---`);
  if (await pass()) {
    console.log("\nBoth subdomains are live.");
    process.exit(0);
  }
  await new Promise((r) => setTimeout(r, 30000));
}
console.log("\nGave up after 30 minutes. DNS may still be propagating.");
process.exit(1);
