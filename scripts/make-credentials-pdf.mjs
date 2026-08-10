// Renders credentials.json as a branded, single-page handover PDF.
import { readFileSync, createWriteStream } from "node:fs";
import PDFDocument from "pdfkit";

const INK = "#14161A";
const INK2 = "#5C616B";
const INK3 = "#9AA0A8";
const VOLT = "#C6F135";
const VOLT_DEEP = "#3C5300";
const SOFT = "#F3F5F1";
const LINE = "#E4E7E2";
const WHITE = "#FFFFFF";

const { accounts, generated } = JSON.parse(readFileSync("credentials.json", "utf8"));

const doc = new PDFDocument({ size: "A4", margin: 0 });
doc.pipe(createWriteStream("Sportsconnect-Test-Accounts.pdf"));

const W = doc.page.width; // 595
const M = 48;
const CW = W - M * 2;

/* ------------------------------------------------------------------ header */
doc.rect(0, 0, W, 148).fill(INK);

// Wordmark: "sports" white, "connect" volt.
doc.font("Helvetica-Bold").fontSize(22).fillColor(WHITE).text("sports", M, 40, {
  continued: true,
});
doc.fillColor(VOLT).text("connect");

doc
  .font("Helvetica-Bold")
  .fontSize(26)
  .fillColor(WHITE)
  .text("Test accounts", M, 78);

doc
  .font("Helvetica")
  .fontSize(10.5)
  .fillColor("#A7ADB6")
  .text(
    "One account per role, for testing the three portals. Each has its own password.",
    M,
    110,
    { width: CW - 140 }
  );

// Volt corner tab.
doc.rect(W - M - 96, 40, 96, 26).fill(VOLT);
doc
  .font("Helvetica-Bold")
  .fontSize(9)
  .fillColor(INK)
  .text("CONFIDENTIAL", W - M - 96, 48, { width: 96, align: "center" });

/* ---------------------------------------------------------------- accounts */
let y = 182;

for (const a of accounts) {
  const H = 152;

  doc.roundedRect(M, y, CW, H, 14).lineWidth(1).strokeColor(LINE).stroke();

  // Role chip.
  const chipW = doc.font("Helvetica-Bold").fontSize(9).widthOfString(a.label.toUpperCase()) + 20;
  doc.roundedRect(M + 20, y + 20, chipW, 20, 10).fill(VOLT);
  doc
    .fillColor(VOLT_DEEP)
    .text(a.label.toUpperCase(), M + 20, y + 26, { width: chipW, align: "center" });

  doc
    .font("Helvetica-Bold")
    .fontSize(15)
    .fillColor(INK)
    .text(a.full_name, M + 20, y + 50);

  doc
    .font("Helvetica")
    .fontSize(9.5)
    .fillColor(INK3)
    .text(a.lands, M + 20 + chipW + 10, y + 26, { width: CW - chipW - 60, align: "right" });

  // Credential boxes.
  const boxY = y + 74;
  const boxW = (CW - 52) / 2;

  const field = (label, value, x, mono) => {
    doc.roundedRect(x, boxY, boxW, 46, 10).fill(SOFT);
    doc
      .font("Helvetica-Bold")
      .fontSize(7.5)
      .fillColor(INK3)
      .text(label.toUpperCase(), x + 12, boxY + 9, { characterSpacing: 0.6 });
    doc
      .font(mono ? "Courier-Bold" : "Helvetica-Bold")
      .fontSize(mono ? 12 : 11)
      .fillColor(INK)
      .text(value, x + 12, boxY + 23, { width: boxW - 24, lineBreak: false });
  };

  field("Email", a.email, M + 20);
  field("Password", a.password, M + 32 + boxW, true);

  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(INK2)
    .text(a.can, M + 20, boxY + 56, { width: CW - 40 });

  y += H + 14;
}

/* ------------------------------------------------------------------- notes */
doc.roundedRect(M, y + 6, CW, 92, 14).fill(INK);

doc
  .font("Helvetica-Bold")
  .fontSize(10.5)
  .fillColor(VOLT)
  .text("Before you share this", M + 20, y + 24);

const notes = [
  "Passwords are unique per account and were generated randomly. Change them after testing.",
  "Payments are settled manually: bank transfer or cash at venue. Card payment is disabled.",
  "Only the Super Admin can mark a payment as paid. This is enforced in the database.",
];

let ny = y + 42;
for (const n of notes) {
  doc.circle(M + 24, ny + 4, 1.8).fill(VOLT);
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor("#D7DBE0")
    .text(n, M + 34, ny, { width: CW - 60 });
  ny += 15;
}

/* ------------------------------------------------------------------ footer */
doc
  .font("Helvetica")
  .fontSize(8)
  .fillColor(INK3)
  .text(
    `Generated ${new Date(generated).toLocaleString("en-AE", { dateStyle: "long", timeStyle: "short" })}  ·  Sportsconnect, Dubai`,
    M,
    doc.page.height - 52,
    { width: CW, align: "center" }
  );

doc.end();
console.log("Wrote Sportsconnect-Test-Accounts.pdf");
