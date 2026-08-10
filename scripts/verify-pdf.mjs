// Extracts the visible text from the generated PDF and asserts every
// credential actually appears on the page.
//
// PDFKit writes text as hex strings inside TJ arrays (<48656c6c6f>), not as
// literal (Hello) strings — a naive search for parentheses finds nothing and
// wrongly reports an empty document.
import { readFileSync } from "node:fs";
import zlib from "node:zlib";

const pdf = process.argv[2] ?? "Sportsconnect-Test-Accounts.pdf";
const raw = readFileSync(pdf).toString("latin1");

let content = "";
const streams = /stream\r?\n([\s\S]*?)endstream/g;
let m;
while ((m = streams.exec(raw))) {
  try {
    content += zlib.inflateSync(Buffer.from(m[1], "latin1")).toString("latin1");
  } catch {
    content += m[1];
  }
}

// Rebuild the page text: every <hex> run inside a TJ/Tj becomes characters.
// Fragments in one TJ array belong to the same word, so join them directly.
let text = "";
for (const tj of content.matchAll(/\[([^\]]*)\]\s*TJ|<([0-9a-fA-F]+)>\s*Tj/g)) {
  const body = tj[1] ?? `<${tj[2]}>`;
  for (const hex of body.matchAll(/<([0-9a-fA-F]+)>/g)) {
    text += Buffer.from(hex[1], "hex").toString("latin1");
  }
  text += " ";
}

const creds = JSON.parse(readFileSync("credentials.json", "utf8")).accounts;

let failures = 0;
console.log(`Extracted ${text.length} characters of text from ${pdf}\n`);

for (const a of creds) {
  const emailOk = text.includes(a.email);
  const pwOk = text.includes(a.password);
  const nameOk = text.includes(a.full_name);
  if (!emailOk || !pwOk || !nameOk) failures++;
  console.log(
    `  ${emailOk && pwOk && nameOk ? "PASS" : "FAIL"}  ${a.label.padEnd(13)}` +
      ` name=${nameOk ? "y" : "N"} email=${emailOk ? "y" : "N"} password=${pwOk ? "y" : "N"}`
  );
  console.log(`        ${a.email}  /  ${a.password}`);
}

// Role chips are rendered uppercase, so compare case-insensitively.
const flat = text.toLowerCase();
for (const s of ["test accounts", "super admin", "event admin", "consumer", "sportsconnect"]) {
  if (!flat.includes(s)) {
    failures++;
    console.log(`  FAIL  heading "${s}" missing`);
  }
}

console.log(
  failures === 0
    ? "\nEvery credential is present and readable in the PDF."
    : `\n${failures} problem(s) with the PDF.`
);
process.exit(failures === 0 ? 0 : 1);
