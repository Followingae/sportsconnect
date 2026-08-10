// Seeds reference data only: the five BRD sports and their formats, the
// default platform fee, and platform settings. Idempotent — safe to re-run.
// It does NOT create users; those come from Supabase Auth.
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const SPORTS = [
  {
    slug: "football",
    name: "Football",
    cover: "/covers/football.webp",
    order: 1,
    formats: [
      ["5-a-side", "team", 5, 2],
      ["7-a-side", "team", 7, 3],
      ["9-a-side", "team", 9, 3],
      ["11-a-side", "team", 11, 5],
      ["tournament", "team", 7, 3],
      ["league", "team", 7, 3],
    ],
  },
  {
    slug: "padel",
    name: "Padel",
    cover: "/covers/padel.webp",
    order: 2,
    formats: [
      ["singles", "individual", 1, 0],
      ["doubles", "team", 2, 1],
      ["tournament", "team", 2, 1],
      ["round-robin", "team", 2, 1],
      ["knockout", "team", 2, 1],
    ],
  },
  {
    slug: "cricket",
    name: "Cricket",
    cover: "/covers/cricket.webp",
    order: 3,
    formats: [
      ["t10", "team", 11, 3],
      ["t20", "team", 11, 3],
      ["tape-ball", "team", 11, 3],
      ["hard-ball", "team", 11, 3],
      ["tournament", "team", 11, 3],
      ["league", "team", 11, 3],
    ],
  },
  {
    slug: "badminton",
    name: "Badminton",
    cover: "/covers/badminton.webp",
    order: 4,
    formats: [
      ["singles", "individual", 1, 0],
      ["doubles", "team", 2, 1],
      ["mixed-doubles", "team", 2, 1],
      ["tournament", "team", 2, 1],
    ],
  },
  {
    slug: "basketball",
    name: "Basketball",
    cover: "/covers/basketball.webp",
    order: 5,
    formats: [
      ["3x3", "team", 3, 1],
      ["5x5", "team", 5, 5],
      ["tournament", "team", 5, 5],
      ["league", "team", 5, 5],
    ],
  },
];

const titleCase = (slug) =>
  slug
    .split("-")
    .map((w) => (/^\d/.test(w) ? w : w[0].toUpperCase() + w.slice(1)))
    .join(" ");

const FORMAT_LABELS = {
  "5-a-side": "5-a-side",
  "7-a-side": "7-a-side",
  "9-a-side": "9-a-side",
  "11-a-side": "11-a-side",
  t10: "T10",
  t20: "T20",
  "tape-ball": "Tape-ball",
  "hard-ball": "Hard-ball",
  "3x3": "3x3",
  "5x5": "5x5",
  "round-robin": "Round robin",
  "mixed-doubles": "Mixed doubles",
};

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
await client.query("begin");

try {
  for (const sport of SPORTS) {
    const { rows } = await client.query(
      `insert into sports (slug, name, cover_url, sort_order)
       values ($1, $2, $3, $4)
       on conflict (slug) do update
         set name = excluded.name,
             cover_url = excluded.cover_url,
             sort_order = excluded.sort_order
       returning id`,
      [sport.slug, sport.name, sport.cover, sport.order]
    );
    const sportId = rows[0].id;

    let i = 0;
    for (const [slug, model, teamSize, subs] of sport.formats) {
      i++;
      await client.query(
        `insert into sport_formats
           (sport_id, slug, name, registration_model, default_team_size,
            default_substitutes, sort_order)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (sport_id, slug) do update
           set name = excluded.name,
               registration_model = excluded.registration_model,
               default_team_size = excluded.default_team_size,
               default_substitutes = excluded.default_substitutes,
               sort_order = excluded.sort_order`,
        [sportId, slug, FORMAT_LABELS[slug] || titleCase(slug), model, teamSize, subs, i]
      );
    }
    console.log(`sport: ${sport.name} (${sport.formats.length} formats)`);
  }

  // Default platform fee — 5%, matching design P10.
  await client.query(
    `insert into platform_fee_config (scope, mode, percentage, is_active)
     select 'global', 'percentage', 5, true
     where not exists (
       select 1 from platform_fee_config where scope = 'global' and is_active
     )`
  );

  // Payment methods: bank transfer + cash at venue only. Online stays off
  // until a gateway is selected.
  await client.query(
    `update platform_settings set
       payment_methods_enabled = array['bank_transfer','cash_at_venue']::payment_method[],
       bank_account_name = coalesce(bank_account_name, 'Sportsconnect FZ-LLC'),
       bank_name         = coalesce(bank_name, 'Emirates NBD'),
       bank_iban         = coalesce(bank_iban, 'AE00 0000 0000 0000 0000 000'),
       bank_swift        = coalesce(bank_swift, 'EBILAEAD'),
       support_email     = coalesce(support_email, 'support@sportsconnect.ae'),
       default_currency  = 'AED',
       updated_at        = now()
     where id = true`
  );

  await client.query("commit");
  console.log("\nSeed complete.");
} catch (err) {
  await client.query("rollback");
  console.error("Seed failed:", err.message);
  process.exit(1);
} finally {
  await client.end();
}
