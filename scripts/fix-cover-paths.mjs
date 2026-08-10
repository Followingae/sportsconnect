// One-off: point stored cover/banner URLs at the WebP files produced by
// scripts/optimise-covers.mjs.
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const a = await client.query(
  "update sports set cover_url = replace(cover_url, '.png', '.webp') where cover_url like '%.png'"
);
const b = await client.query(
  "update events set banner_url = replace(banner_url, '.png', '.webp') where banner_url like '%.png'"
);

console.log(`sports updated: ${a.rowCount}, events updated: ${b.rowCount}`);

const { rows } = await client.query("select slug, cover_url from sports order by sort_order");
for (const r of rows) console.log(`  ${r.slug.padEnd(12)} ${r.cover_url}`);

await client.end();
