// Builds one branded walkthrough PDF per role: what the role is for, the
// account to sign in with, and the numbered things to actually try.
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
const WARN_BG = "#FBF1DA";
const WARN = "#8A6A12";

const creds = JSON.parse(readFileSync("credentials.json", "utf8")).accounts;
const find = (role) => creds.find((c) => c.role === role);

const GUIDES = [
  {
    role: "super_admin",
    file: "Sportsconnect-Guide-Super-Admin.pdf",
    title: "Super Admin",
    strap: "You run the platform. Nothing reaches the public without you.",
    url: "admin.sportsconnect.ae",
    fallback: "www.sportsconnect.ae/admin",
    summary:
      "The Super Admin is the control room. You approve every event before it becomes visible, you are the only person who can confirm money has been received, and you decide every refund. You also create the Event Admin accounts that clubs and organizers use.",
    sections: [
      {
        h: "Approve an event",
        steps: [
          "Open Approvals. Anything an organizer has submitted is waiting there.",
          "Click Review on an event. You see the full submission: dates, venue, capacity, entry fee, rules, cancellation policy and banner.",
          "The checklist on the right flags anything missing before you decide.",
          "Approve, Request changes, or Reject. The last two need a note, which the organizer sees in their portal.",
          "Approved events then need Publish, and Open registration, from the Events screen. Three deliberate steps, so nothing goes live by accident.",
        ],
      },
      {
        h: "Reconcile money",
        steps: [
          "Open Payments. Filter by Awaiting verification to see transfers people say they have sent, and cash organizers say they have collected.",
          "Check your bank against the reference code shown on each row.",
          "Click Mark paid. This confirms the participant's place and emails them.",
          "Select several rows and use Mark paid in bulk when a batch clears together.",
          "Nobody else on the platform can do this. An Event Admin can only report cash as collected.",
        ],
      },
      {
        h: "Handle a refund",
        steps: [
          "Open Refunds. Requests arrive when a consumer cancels, or automatically when an event is cancelled.",
          "Click Decide. You see the original payment, the reason and the event's policy.",
          "Enter the amount. Less than the original is recorded as a partial refund.",
          "Add a settlement note, for example the bank reference you used to send the money back.",
          "Approve or Decline. The consumer is notified either way.",
        ],
      },
      {
        h: "Create an Event Admin",
        steps: [
          "Open Event Admins, then Create admin.",
          "Enter their name, email and organization.",
          "Tick the permissions they should have. These are per person, not fixed to the role.",
          "They receive an email to set their own password. You never see it.",
          "You can change permissions or deactivate them at any time.",
        ],
      },
      {
        h: "Configure the platform",
        steps: [
          "Sports and formats: add a sport, add formats, set default squad sizes.",
          "Platform fee: none, fixed, percentage or both, with a live worked example.",
          "Settings: your bank details for transfers, which payment methods are offered, support contacts and default policies.",
          "Reports: revenue and registrations by month and by sport, top events, organizer performance.",
          "Audit log: every approval, payment, grant and participant change, with who did it and when.",
        ],
      },
    ],
  },

  {
    role: "event_admin",
    file: "Sportsconnect-Guide-Event-Admin.pdf",
    title: "Event Admin",
    strap: "You build and run events. A Super Admin approves them.",
    url: "organizer.sportsconnect.ae",
    fallback: "www.sportsconnect.ae/organizer",
    summary:
      "Event Admins are the clubs and organizers. You create events through a ten step builder, submit them for approval, then manage everyone who registers: teams, payments and messages. You can record that you took cash, but only a Super Admin confirms money as received.",
    sections: [
      {
        h: "Build an event",
        steps: [
          "Create event opens a ten step builder. Save a draft at any point and come back.",
          "Steps 1 to 3: name and description, sport and format, then date and venue.",
          "Step 2 matters most. The format decides whether people register solo or as squads, and sets default team sizes.",
          "Steps 4 and 5: how many can register, waitlist size, age, gender and skill requirements.",
          "Step 6: your entry fee. The platform fee and the total the participant pays are shown live.",
          "Steps 7 and 8: rules, eligibility, cancellation policy, what is included, and the banner image.",
          "Steps 9 and 10: preview exactly what the public will see, then submit. Anything still missing is listed with a link to the step that fixes it.",
        ],
      },
      {
        h: "If changes are requested",
        steps: [
          "The event appears under Needs your attention on your dashboard.",
          "The reviewer's note is shown at the top of the event.",
          "Open Edit, make the changes, and submit again.",
        ],
      },
      {
        h: "Manage participants",
        steps: [
          "Open an event, then Participants. Everyone who registered online is listed with their payment and registration status.",
          "Add participant covers walk-ins, offline payments, complimentary entries and VIPs.",
          "Row actions: change status, assign a team, change role, or remove.",
          "Export gives you a CSV of whatever is currently filtered.",
          "Every change is written to the audit log.",
        ],
      },
      {
        h: "Teams and squads",
        steps: [
          "Teams shows every squad with its captain, players and substitutes.",
          "A team is marked Complete, Incomplete or Over capacity against the size you set.",
          "Unassigned registrations sit in their own column. Assign them to a team in one click.",
          "Individual formats skip this entirely.",
        ],
      },
      {
        h: "Money and messages",
        steps: [
          "Payments shows expected collection, what is reconciled, and who has not paid.",
          "Record cash marks a payment as collected and awaiting verification. A Super Admin confirms it.",
          "Messages sends to everyone, or only the confirmed, waitlisted or unpaid.",
          "Reports shows registrations over time, revenue and fill rate.",
        ],
      },
    ],
  },

  {
    role: "consumer",
    file: "Sportsconnect-Guide-Consumer.pdf",
    title: "Consumer",
    strap: "The player. Finds events, registers, pays, shows up.",
    url: "www.sportsconnect.ae",
    fallback: null,
    summary:
      "Consumers browse the public site, register solo or as a team, and pay by bank transfer or cash at the venue. They can browse everything without an account; only registering needs one.",
    sections: [
      {
        h: "Find an event",
        steps: [
          "The landing page shows what is live now. Open app goes into the product.",
          "Home has featured events, registration closing soon, upcoming, and the five sports.",
          "Explore filters by sport, format, date, price, skill, gender, age group, availability and organizer, and sorts by date, price, popularity or deadline.",
          "Filters live in the address bar, so a filtered list can be shared as a link.",
        ],
      },
      {
        h: "Register",
        steps: [
          "The event page shows everything: dates, venue, entry fee, what is included, rules, eligibility and the cancellation policy.",
          "Register your team, or Register now for individual formats.",
          "Name your squad and add teammates, then answer whatever the organizer asked, for example jersey size or skill level.",
          "Review shows the full breakdown: entry fee, platform fee, any discount, any VAT, and the total.",
          "Accept the terms and cancellation policy to continue.",
        ],
      },
      {
        h: "Pay",
        steps: [
          "Choose Bank transfer or Cash at venue. Card payment is visible but switched off.",
          "Bank transfer shows the account name, IBAN, SWIFT, the exact amount and a unique reference. Every field can be copied.",
          "The reference is what matches your money to your place, so it has to be included.",
          "Cash at venue shows how much to bring, who to pay and when to arrive.",
          "Either way the registration sits at Pending payment until an admin confirms the money.",
        ],
      },
      {
        h: "Afterwards",
        steps: [
          "My events splits into Upcoming, Waitlist, Past and Cancelled.",
          "Payments shows every amount, reference, status and any refund, plus account credit and member discount.",
          "If an event is full you can join the waitlist and see your position.",
          "Notifications collects confirmations, payment updates and event changes.",
        ],
      },
    ],
  },
];

function build(guide) {
  const account = find(guide.role);
  const doc = new PDFDocument({ size: "A4", margin: 0, bufferPages: true });
  doc.pipe(createWriteStream(guide.file));

  const W = doc.page.width;
  const H = doc.page.height;
  const M = 48;
  const CW = W - M * 2;

  /* ---------------------------------------------------------- cover band */
  doc.rect(0, 0, W, 210).fill(INK);

  doc.font("Helvetica-Bold").fontSize(19).fillColor(WHITE).text("sports", M, 40, {
    continued: true,
  });
  doc.fillColor(VOLT).text("connect");

  const chip = guide.title.toUpperCase();
  const chipW = doc.font("Helvetica-Bold").fontSize(9).widthOfString(chip) + 22;
  doc.roundedRect(M, 78, chipW, 22, 11).fill(VOLT);
  doc
    .fillColor(VOLT_DEEP)
    .text(chip, M, 85, { width: chipW, align: "center" });

  doc
    .font("Helvetica-Bold")
    .fontSize(30)
    .fillColor(WHITE)
    .text(guide.title + " guide", M, 112);

  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor("#A7ADB6")
    .text(guide.strap, M, 152, { width: CW - 40 });

  /* ------------------------------------------------------------- account */
  let y = 236;
  doc.roundedRect(M, y, CW, 92, 14).fill(SOFT);

  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(INK3)
    .text("SIGN IN AT", M + 20, y + 16, { characterSpacing: 0.7 });
  doc
    .font("Helvetica-Bold")
    .fontSize(13)
    .fillColor(VOLT_DEEP)
    .text(guide.url, M + 20, y + 30);
  if (guide.fallback) {
    doc
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(INK3)
      .text(`or ${guide.fallback}`, M + 20, y + 48);
  }

  if (account) {
    const rx = M + CW / 2 + 6;
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(INK3)
      .text("EMAIL", rx, y + 16, { characterSpacing: 0.7 });
    doc.font("Helvetica-Bold").fontSize(11).fillColor(INK).text(account.email, rx, y + 29);
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(INK3)
      .text("PASSWORD", rx, y + 50, { characterSpacing: 0.7 });
    doc.font("Courier-Bold").fontSize(13).fillColor(INK).text(account.password, rx, y + 63);
  }

  y += 92 + 22;

  /* ------------------------------------------------------------- summary */
  doc
    .font("Helvetica")
    .fontSize(11)
    .fillColor(INK2)
    .text(guide.summary, M, y, { width: CW, lineGap: 3.5 });
  y = doc.y + 26;

  /* ------------------------------------------------------------ sections */
  const ensureRoom = (needed) => {
    if (y + needed > H - 80) {
      doc.addPage();
      y = 56;
    }
  };

  for (const s of guide.sections) {
    ensureRoom(90);

    doc.roundedRect(M, y - 4, 4, 18, 2).fill(VOLT);
    doc.font("Helvetica-Bold").fontSize(14).fillColor(INK).text(s.h, M + 16, y - 4);
    y = doc.y + 12;

    let i = 1;
    for (const step of s.steps) {
      const h = doc.font("Helvetica").fontSize(10).heightOfString(step, { width: CW - 34 });
      ensureRoom(h + 16);

      doc.circle(M + 8, y + 5.5, 8).fill(SOFT);
      doc
        .font("Helvetica-Bold")
        .fontSize(8)
        .fillColor(INK2)
        .text(String(i), M, y + 2.5, { width: 16, align: "center" });

      doc
        .font("Helvetica")
        .fontSize(10)
        .fillColor(INK2)
        .text(step, M + 26, y, { width: CW - 34, lineGap: 2.5 });

      y = doc.y + 9;
      i++;
    }
    y += 14;
  }

  /* ------------------------------------------------------- test-data note */
  ensureRoom(86);
  doc.roundedRect(M, y, CW, 68, 12).fill(WARN_BG);
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(WARN)
    .text("Everything you see is test data", M + 18, y + 15);
  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(WARN)
    .text(
      "The events, teams, registrations and payments on the platform right now were created for demonstration. " +
        "Nothing is real and no money has moved. Anything you approve, reject, mark paid or refund is safe to click.",
      M + 18,
      y + 32,
      { width: CW - 36, lineGap: 2 }
    );

  /* ------------------------------------------------------------- footers */
  const range = doc.bufferedPageRange();
  for (let p = 0; p < range.count; p++) {
    doc.switchToPage(p);
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(INK3)
      .text(
        `Sportsconnect  ·  ${guide.title} guide  ·  page ${p + 1} of ${range.count}`,
        M,
        H - 42,
        { width: CW, align: "center" }
      );
  }

  doc.end();
  return guide.file;
}

for (const g of GUIDES) {
  console.log(`  ${build(g)}`);
}
console.log(`\n${GUIDES.length} role guides written.`);
