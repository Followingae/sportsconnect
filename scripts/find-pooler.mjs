// The direct db.<ref>.supabase.co host is IPv6-only. This probes the shared
// poolers to find which region hosts the project, then prints a DATABASE_URL.
import pg from "pg";

const REF = process.argv[2] || "ldgymkxdlguowriprxpt";
const PASSWORD = process.argv[3] || "Sportsconnect2026!";

const REGIONS = [
  "ap-south-1",
  "ap-southeast-1",
  "eu-central-1",
  "eu-west-1",
  "eu-west-2",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "ap-northeast-1",
  "ap-southeast-2",
  "sa-east-1",
  "ca-central-1",
  "eu-central-2",
  "eu-north-1",
  "ap-northeast-2",
  "ap-east-1",
  "us-west-2",
];

async function probe(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const client = new pg.Client({
    host,
    port: 5432,
    user: `postgres.${REF}`,
    password: PASSWORD,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
    query_timeout: 8000,
  });
  try {
    await client.connect();
    const r = await client.query("select current_database() db, version() v");
    await client.end();
    return { region, host, ok: true, db: r.rows[0].db };
  } catch (err) {
    try {
      await client.end();
    } catch {}
    return { region, host, ok: false, msg: err.message };
  }
}

const results = await Promise.all(REGIONS.map(probe));
const hit = results.find((r) => r.ok);

for (const r of results) {
  console.log(`${r.ok ? "HIT " : "  . "} ${r.region.padEnd(16)} ${r.ok ? r.db : r.msg}`);
}

if (hit) {
  const pw = encodeURIComponent(PASSWORD);
  console.log("\nFound it. Use this DATABASE_URL:\n");
  console.log(`postgresql://postgres.${REF}:${pw}@${hit.host}:5432/postgres`);
} else {
  console.log("\nNo region accepted the credentials.");
  process.exit(1);
}
