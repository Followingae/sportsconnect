// Applies every SQL file in supabase/migrations, in filename order, inside a
// single transaction each. Tracks what has run in a _migrations table so it is
// safe to re-run.
import { readdir, readFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dir = join(root, "supabase", "migrations");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing. Add it to .env.local");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
await client.query(`
  create table if not exists _migrations (
    name text primary key,
    applied_at timestamptz not null default now()
  );
`);

const applied = new Set(
  (await client.query("select name from _migrations")).rows.map((r) => r.name)
);

const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
let ran = 0;

for (const file of files) {
  if (applied.has(file)) {
    console.log(`skip  ${file} (already applied)`);
    continue;
  }
  const sql = await readFile(join(dir, file), "utf8");
  process.stdout.write(`apply ${file} ... `);
  try {
    await client.query("begin");
    await client.query(sql);
    await client.query("insert into _migrations (name) values ($1)", [file]);
    await client.query("commit");
    console.log("ok");
    ran++;
  } catch (err) {
    await client.query("rollback");
    console.log("FAILED");
    console.error(`\n${err.message}\n`);
    if (err.position) {
      const pos = Number(err.position);
      const upto = sql.slice(0, pos);
      const line = upto.split("\n").length;
      console.error(`at line ${line}:`);
      console.error(sql.split("\n").slice(Math.max(0, line - 4), line + 2).join("\n"));
    }
    await client.end();
    process.exit(1);
  }
}

console.log(`\nDone. ${ran} migration(s) applied, ${files.length - ran} already current.`);
await client.end();
