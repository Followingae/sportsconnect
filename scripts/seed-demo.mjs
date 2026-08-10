// Demo content: one event per lifecycle state so every screen and every gate
// can actually be seen. Idempotent by slug. Development only.
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const org = (await client.query("select id from profiles where role = 'event_admin' limit 1"))
  .rows[0];
const orgRow = (await client.query("select id from organizations limit 1")).rows[0];
const player = (await client.query("select id from profiles where role = 'consumer' limit 1"))
  .rows[0];

if (!org) {
  console.error("Run `npm run db:users` first — no event_admin exists.");
  process.exit(1);
}

const sports = Object.fromEntries(
  (await client.query("select slug, id from sports")).rows.map((r) => [r.slug, r.id])
);
const formats = Object.fromEntries(
  (
    await client.query(
      `select s.slug || ':' || f.slug as k, f.id
       from sport_formats f join sports s on s.id = f.sport_id`
    )
  ).rows.map((r) => [r.k, r.id])
);

const day = (n) => new Date(Date.now() + n * 86_400_000).toISOString();

const EVENTS = [
  {
    slug: "dubai-padel-open-2026",
    name: "Dubai Padel Open 2026",
    sport: "padel",
    format: "doubles",
    status: "registration_open",
    starts: day(36),
    opens: day(-10),
    closes: day(30),
    price: 250,
    unit: "per_team",
    model: "team",
    venue: "XYZ Padel Club",
    address: "Al Quoz 1, Dubai",
    featured: true,
    max_teams: 32,
    team_size: 2,
    subs: 1,
    waitlist: 8,
    included: ["Glass courts", "Balls", "Referee", "Prizes"],
    description:
      "The flagship padel doubles tournament of the season.\n\nGroup stage on Saturday, knockouts on Sunday. Mixed and open categories run in parallel.",
    rules:
      "Best-of-three sets, golden point at deuce. Group stage then knockout. Referees provided for quarter-finals onward.",
    eligibility: "Intermediate and above. Ages 16+. Mixed and open categories.",
    requirements: "Bring your own rackets. Balls are provided. Court shoes required.",
    policy:
      "Full refund if cancelled 48 hours before the start. 50% refund within 48 hours. No refund after the event starts or for no-shows.",
    contact_email: "events@padelpro.ae",
    contact_phone: "+971 4 000 0000",
  },
  {
    slug: "friday-night-7s",
    name: "Friday Night 7s",
    sport: "football",
    format: "7-a-side",
    status: "registration_open",
    starts: day(5),
    opens: day(-20),
    closes: day(3),
    price: 420,
    unit: "per_team",
    model: "team",
    venue: "Al Quoz Sports Park",
    address: "Al Quoz 2, Dubai",
    max_teams: 8,
    team_size: 7,
    subs: 3,
    waitlist: 4,
    included: ["Pitch hire", "Bibs", "Referee", "Water"],
    description: "Weekly 7-a-side league under floodlights. Squads of 7 plus 3 subs.",
    rules: "Two 25-minute halves. Rolling substitutions. No slide tackles.",
    eligibility: "Open to all. Ages 18+.",
    requirements: "Astro boots only — no metal studs.",
    policy: "Full refund up to 72 hours before kick-off. No refund after that.",
    contact_email: "league@quozfc.ae",
  },
  {
    slug: "corporate-cricket-t20",
    name: "Corporate Cricket T20",
    sport: "cricket",
    format: "t20",
    status: "under_review",
    starts: day(55),
    opens: day(5),
    closes: day(50),
    price: 600,
    unit: "per_team",
    model: "team",
    venue: "ICC Academy",
    address: "Dubai Sports City",
    max_teams: 12,
    team_size: 11,
    subs: 3,
    waitlist: 0,
    included: ["Match balls", "Umpires", "Scoring"],
    description:
      "Corporate T20 league across four weekends. Squads of 11 plus 3 substitutes.",
    rules: "Tape-ball for the group stage, hard-ball for the finals. Whites optional.",
    eligibility: "Corporate teams only — one company per squad.",
    policy: "Full refund until registration closes.",
  },
  {
    slug: "smash-hour-badminton",
    name: "Smash Hour Badminton",
    sport: "badminton",
    format: "mixed-doubles",
    status: "sold_out",
    starts: day(12),
    opens: day(-25),
    closes: day(10),
    price: 90,
    unit: "per_team",
    model: "team",
    venue: "Smash Hour Courts",
    address: "Jumeirah, Dubai",
    max_teams: 2,
    team_size: 2,
    subs: 0,
    waitlist: 6,
    included: ["Shuttles", "Court hire"],
    description: "Fast mixed-doubles evening. Two courts, round robin, prizes for the top pair.",
    policy: "Full refund up to 24 hours before.",
  },
  {
    slug: "3x3-summer-jam",
    name: "3x3 Summer Jam",
    sport: "basketball",
    format: "3x3",
    status: "published",
    starts: day(70),
    opens: day(20),
    closes: day(65),
    price: 180,
    unit: "per_team",
    model: "team",
    venue: "Hoops DXB",
    address: "Business Bay, Dubai",
    max_teams: 16,
    team_size: 3,
    subs: 1,
    waitlist: 4,
    included: ["Court hire", "Referee", "Prizes"],
    description: "Half-court 3x3 tournament. Squads of 3 plus one sub.",
    policy: "Full refund until registration opens plus 7 days.",
  },
  {
    slug: "padel-singles-ladder",
    name: "Padel Singles Ladder",
    sport: "padel",
    format: "singles",
    status: "registration_closed",
    starts: day(2),
    opens: day(-40),
    closes: day(-1),
    price: 75,
    unit: "per_player",
    model: "individual",
    venue: "Padel Center Central",
    address: "Al Barsha, Dubai",
    max_participants: 16,
    waitlist: 0,
    included: ["Court hire", "Balls"],
    description: "Individual singles ladder. Play three matches guaranteed.",
    policy: "No refunds once registration closes.",
  },
  {
    slug: "sunset-padel-social",
    name: "Sunset Padel Social",
    sport: "padel",
    format: "doubles",
    status: "cancelled",
    starts: day(8),
    opens: day(-30),
    closes: day(6),
    price: 120,
    unit: "per_team",
    model: "team",
    venue: "Padel Center Central",
    max_teams: 12,
    team_size: 2,
    subs: 0,
    waitlist: 0,
    cancel_reason: "Venue double-booked by the club",
    description: "Relaxed social doubles at golden hour.",
    policy: "Full refund on organizer cancellation.",
  },
  {
    slug: "spring-football-9s",
    name: "Spring Football 9s",
    sport: "football",
    format: "9-a-side",
    status: "completed",
    starts: day(-14),
    opens: day(-60),
    closes: day(-20),
    price: 500,
    unit: "per_team",
    model: "team",
    venue: "Al Quoz Sports Park",
    max_teams: 10,
    team_size: 9,
    subs: 3,
    waitlist: 0,
    included: ["Pitch hire", "Referee", "Medals"],
    description: "Spring 9-a-side tournament. Congratulations to the winners.",
    policy: "Event completed.",
  },
];

let created = 0;
for (const e of EVENTS) {
  const sportId = sports[e.sport];
  const formatId = formats[`${e.sport}:${e.format}`];
  if (!sportId || !formatId) {
    console.warn(`skip ${e.slug}: unknown sport/format`);
    continue;
  }

  const { rows } = await client.query(
    `insert into events (
       slug, name, sport_id, format_id, description, organizer_id, organization_id,
       banner_url, venue_name, venue_address, starts_at, ends_at,
       registration_opens_at, registration_closes_at,
       rules, eligibility, whats_included, participant_requirements,
       cancellation_policy, contact_email, contact_phone,
       registration_model, price_amount, price_unit, currency,
       status, is_featured, published_at, cancelled_at, cancellation_reason, created_by
     ) values (
       $1,$2,$3,$4,$5,$6,$7,
       $8,$9,$10,$11,$12,
       $13,$14,
       $15,$16,$17,$18,
       $19,$20,$21,
       $22,$23,$24,'AED',
       $25::event_status,$26,now(),$27,$28,$6
     )
     on conflict (slug) do update set
       name = excluded.name,
       status = excluded.status,
       starts_at = excluded.starts_at,
       registration_opens_at = excluded.registration_opens_at,
       registration_closes_at = excluded.registration_closes_at,
       price_amount = excluded.price_amount,
       is_featured = excluded.is_featured,
       cancellation_reason = excluded.cancellation_reason
     returning id`,
    [
      e.slug,
      e.name,
      sportId,
      formatId,
      e.description ?? "",
      org.id,
      orgRow?.id ?? null,
      `/covers/${e.sport}.webp`,
      e.venue ?? null,
      e.address ?? null,
      e.starts,
      null,
      e.opens,
      e.closes,
      e.rules ?? null,
      e.eligibility ?? null,
      e.included ?? [],
      e.requirements ?? null,
      e.policy ?? null,
      e.contact_email ?? null,
      e.contact_phone ?? null,
      e.model,
      e.price,
      e.unit,
      e.status,
      e.featured ?? false,
      e.status === "cancelled" ? new Date().toISOString() : null,
      e.cancel_reason ?? null,
    ]
  );

  const eventId = rows[0].id;

  await client.query(
    `insert into event_config (
       event_id, max_participants, min_participants, waitlist_capacity,
       min_age, gender_requirement, skill_levels,
       team_size, max_teams, substitutes_per_team, allow_individual_join
     ) values ($1,$2,$3,$4,$5,$6::gender_requirement,$7,$8,$9,$10,false)
     on conflict (event_id) do update set
       max_participants = excluded.max_participants,
       waitlist_capacity = excluded.waitlist_capacity,
       team_size = excluded.team_size,
       max_teams = excluded.max_teams,
       substitutes_per_team = excluded.substitutes_per_team`,
    [
      eventId,
      e.max_participants ?? null,
      2,
      e.waitlist ?? 0,
      16,
      "any",
      ["Beginner", "Intermediate", "Advanced"],
      e.team_size ?? null,
      e.max_teams ?? null,
      e.subs ?? 0,
    ]
  );

  // Custom questions on the flagship event, covering several field types.
  if (e.slug === "dubai-padel-open-2026") {
    const qs = [
      ["Skill level", "multiple_choice", ["Beginner", "Intermediate", "Advanced"], true],
      ["Jersey size", "dropdown", ["S", "M", "L", "XL"], true],
      ["Emergency contact", "text", [], false],
    ];
    let i = 0;
    for (const [label, type, options, req] of qs) {
      i++;
      await client.query(
        `insert into custom_questions (event_id, label, type, options, is_required, sort_order)
         select $1,$2,$3::question_type,$4::jsonb,$5,$6
         where not exists (
           select 1 from custom_questions where event_id = $1 and label = $2
         )`,
        [eventId, label, type, JSON.stringify(options), req, i]
      );
    }
  }

  // Make "sold out" genuinely full so the waitlist gate is exercised.
  if (e.status === "sold_out" && player) {
    const { rows: existing } = await client.query(
      "select count(*)::int as n from registrations where event_id = $1",
      [eventId]
    );
    if (existing[0].n === 0) {
      for (let i = 1; i <= (e.max_teams ?? 2); i++) {
        const t = await client.query(
          `insert into teams (event_id, name, created_by) values ($1,$2,$3)
           on conflict do nothing returning id`,
          [eventId, `Pair ${i}`, org.id]
        );
        if (t.rows[0]) {
          await client.query(
            `insert into registrations
               (event_id, team_id, participant_name, role, status, source, created_by)
             values ($1,$2,$3,'captain','confirmed','admin',$4)`,
            [eventId, t.rows[0].id, `Placeholder Player ${i}`, org.id]
          );
        }
      }
    }
  }

  created++;
  console.log(`  ${e.status.padEnd(20)} ${e.slug}`);
}

console.log(`\n${created} events seeded.`);
await client.end();
