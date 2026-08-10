// Introspects the live database and emits src/lib/database.types.ts in the
// shape @supabase/supabase-js expects. Replaces `supabase gen types`, which
// needs Docker.
import { writeFile } from "node:fs/promises";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

// --- enums -----------------------------------------------------------------
const { rows: enumRows } = await client.query(`
  -- Cast to text[]: node-pg has no parser for name[] and would hand back a
  -- raw "{a,b,c}" string instead of an array.
  select t.typname as name,
         array_agg(e.enumlabel::text order by e.enumsortorder) as labels
  from pg_type t
  join pg_enum e on e.enumtypid = t.oid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
  group by t.typname
  order by t.typname
`);
const enums = new Map(enumRows.map((r) => [r.name, r.labels]));

// --- columns ---------------------------------------------------------------
const { rows: colRows } = await client.query(`
  select
    c.table_name,
    c.column_name,
    c.is_nullable = 'YES'                       as nullable,
    c.data_type,
    c.udt_name,
    c.column_default is not null
      or c.is_identity = 'YES'                  as has_default
  from information_schema.columns c
  join information_schema.tables t
    on t.table_schema = c.table_schema and t.table_name = c.table_name
  where c.table_schema = 'public'
    and t.table_type = 'BASE TABLE'
    and c.table_name not like '\\_%'
  order by c.table_name, c.ordinal_position
`);

// --- foreign keys ----------------------------------------------------------
// postgrest-js resolves nested selects (`sport:sports(...)`) from these. With
// an empty Relationships list every embed types as SelectQueryError.
const { rows: fkRows } = await client.query(`
  select
    con.conname                                    as fk_name,
    cl.relname                                     as table_name,
    fcl.relname                                    as ref_table,
    array_agg(att.attname  order by u.ord)::text[] as columns,
    array_agg(fatt.attname order by u.ord)::text[] as ref_columns,
    -- One-to-one when the referencing columns are themselves unique, e.g.
    -- event_config.event_id being both PK and FK.
    --
    -- Uniqueness can come from a constraint OR a bare unique index, and
    -- PostgREST honours both when it decides whether an embed is an object or
    -- an array. Checking only pg_constraint makes the generated types disagree
    -- with the runtime for any bare CREATE UNIQUE INDEX.
    (
      exists (
        select 1 from pg_constraint uc
        where uc.conrelid = con.conrelid
          and uc.contype in ('p', 'u')
          and uc.conkey @> con.conkey
          and con.conkey @> uc.conkey
      )
      or exists (
        select 1 from pg_index i
        where i.indrelid = con.conrelid
          and i.indisunique
          and i.indpred is null                 -- ignore partial indexes
          and i.indnkeyatts = array_length(con.conkey, 1)
          and (select array_agg(k order by k) from unnest(i.indkey::int2[]) k)
              = (select array_agg(c order by c) from unnest(con.conkey) c)
      )
    )                                              as is_one_to_one
  from pg_constraint con
  join pg_class cl      on cl.oid  = con.conrelid
  join pg_namespace n   on n.oid   = cl.relnamespace
  join pg_class fcl     on fcl.oid = con.confrelid
  join lateral unnest(con.conkey)  with ordinality as u(attnum, ord)   on true
  join lateral unnest(con.confkey) with ordinality as fu(attnum, ord2) on fu.ord2 = u.ord
  join pg_attribute att  on att.attrelid  = con.conrelid  and att.attnum  = u.attnum
  join pg_attribute fatt on fatt.attrelid = con.confrelid and fatt.attnum = fu.attnum
  where con.contype = 'f' and n.nspname = 'public'
  group by con.conname, cl.relname, fcl.relname, con.conrelid, con.conkey
  order by cl.relname, con.conname
`);

const fksByTable = new Map();
for (const fk of fkRows) {
  if (!fksByTable.has(fk.table_name)) fksByTable.set(fk.table_name, []);
  fksByTable.get(fk.table_name).push(fk);
}

await client.end();

// --- mapping ---------------------------------------------------------------
function tsType(col) {
  const udt = col.udt_name;

  // Arrays come back as _<element>.
  if (udt.startsWith("_")) {
    const inner = tsType({ ...col, udt_name: udt.slice(1), data_type: "" });
    return `${inner}[]`;
  }
  if (enums.has(udt)) return `Database["public"]["Enums"]["${udt}"]`;

  switch (udt) {
    case "int2":
    case "int4":
    case "int8":
    case "float4":
    case "float8":
    case "numeric":
      return "number";
    case "bool":
      return "boolean";
    case "json":
    case "jsonb":
      return "Json";
    default:
      // uuid, text, citext, varchar, bpchar, timestamptz, date, time, bytea…
      return "string";
  }
}

const tables = new Map();
for (const col of colRows) {
  if (!tables.has(col.table_name)) tables.set(col.table_name, []);
  tables.get(col.table_name).push(col);
}

// --- emit ------------------------------------------------------------------
const L = [];
L.push("// AUTO-GENERATED by scripts/gen-types.mjs — do not edit by hand.");
L.push("// Regenerate after every migration:  node scripts/gen-types.mjs");
L.push("");
L.push("export type Json =");
L.push("  | string");
L.push("  | number");
L.push("  | boolean");
L.push("  | null");
L.push("  | { [key: string]: Json | undefined }");
L.push("  | Json[];");
L.push("");
L.push("export type Database = {");
L.push("  public: {");
L.push("    Tables: {");

for (const [table, cols] of [...tables].sort()) {
  L.push(`      ${table}: {`);

  L.push("        Row: {");
  for (const c of cols) {
    L.push(`          ${c.column_name}: ${tsType(c)}${c.nullable ? " | null" : ""};`);
  }
  L.push("        };");

  L.push("        Insert: {");
  for (const c of cols) {
    const optional = c.nullable || c.has_default ? "?" : "";
    L.push(
      `          ${c.column_name}${optional}: ${tsType(c)}${c.nullable ? " | null" : ""};`
    );
  }
  L.push("        };");

  L.push("        Update: {");
  for (const c of cols) {
    L.push(`          ${c.column_name}?: ${tsType(c)}${c.nullable ? " | null" : ""};`);
  }
  L.push("        };");

  const fks = fksByTable.get(table) ?? [];
  if (fks.length === 0) {
    L.push("        Relationships: [];");
  } else {
    L.push("        Relationships: [");
    for (const fk of fks) {
      const cols = fk.columns.map((c) => `"${c}"`).join(", ");
      const refCols = fk.ref_columns.map((c) => `"${c}"`).join(", ");
      L.push("          {");
      L.push(`            foreignKeyName: "${fk.fk_name}";`);
      L.push(`            columns: [${cols}];`);
      L.push(`            isOneToOne: ${fk.is_one_to_one};`);
      L.push(`            referencedRelation: "${fk.ref_table}";`);
      L.push(`            referencedColumns: [${refCols}];`);
      L.push("          },");
    }
    L.push("        ];");
  }
  L.push("      };");
}

L.push("    };");
// `[_ in never]: never` is the idiomatic empty-schema form. A plain
// `{ [key: string]: never }` index signature makes supabase-js resolve every
// table row to `never`, which silently breaks inference at every call site.
L.push("    Views: { [_ in never]: never };");
L.push("    Functions: { [_ in never]: never };");
L.push("    Enums: {");
for (const [name, labels] of [...enums].sort()) {
  L.push(`      ${name}: ${labels.map((l) => `"${l}"`).join(" | ")};`);
}
L.push("    };");
L.push("    CompositeTypes: { [_ in never]: never };");
L.push("  };");
L.push("};");
L.push("");

// Convenience aliases so app code reads well.
L.push("type PublicSchema = Database[\"public\"];");
L.push("export type Tables<T extends keyof PublicSchema[\"Tables\"]> =");
L.push("  PublicSchema[\"Tables\"][T][\"Row\"];");
L.push("export type TablesInsert<T extends keyof PublicSchema[\"Tables\"]> =");
L.push("  PublicSchema[\"Tables\"][T][\"Insert\"];");
L.push("export type TablesUpdate<T extends keyof PublicSchema[\"Tables\"]> =");
L.push("  PublicSchema[\"Tables\"][T][\"Update\"];");
L.push("export type Enums<T extends keyof PublicSchema[\"Enums\"]> =");
L.push("  PublicSchema[\"Enums\"][T];");
L.push("");

await writeFile("src/lib/database.types.ts", L.join("\n"), "utf8");
console.log(
  `Wrote src/lib/database.types.ts — ${tables.size} tables, ${enums.size} enums.`
);
