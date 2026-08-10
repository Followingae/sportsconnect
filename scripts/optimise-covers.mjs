// The handoff ships ~2.4MB PNGs per sport. They're the same photographs at
// print resolution; as web covers they only ever render ~1600px wide. This
// converts them once to WebP so the repo, the build trace and first paint all
// stay small. Re-run only if new artwork lands.
import { readdir, stat, unlink } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const DIR = "public/covers";
// The five BRD sports, plus the three extra photographs the marketing landing
// page uses for its venue cards and secondary imagery.
const KEEP = new Set([
  "football",
  "padel",
  "cricket",
  "badminton",
  "basketball",
  "padel-alt",
  "football-alt",
  "tennis-court",
]);

const files = await readdir(DIR);
let before = 0;
let after = 0;

for (const file of files) {
  if (!file.endsWith(".png")) continue;
  const name = file.replace(/\.png$/, "");
  const path = join(DIR, file);

  if (!KEEP.has(name)) {
    await unlink(path);
    console.log(`removed  ${file} (unused sport)`);
    continue;
  }

  const src = await stat(path);
  before += src.size;

  const out = join(DIR, `${name}.webp`);
  await sharp(path)
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 78, effort: 5 })
    .toFile(out);

  const dst = await stat(out);
  after += dst.size;
  await unlink(path);

  console.log(
    `${name.padEnd(12)} ${(src.size / 1024 / 1024).toFixed(2)}MB → ${(dst.size / 1024).toFixed(0)}KB`
  );
}

console.log(
  `\nTotal ${(before / 1024 / 1024).toFixed(1)}MB → ${(after / 1024 / 1024).toFixed(2)}MB`
);
