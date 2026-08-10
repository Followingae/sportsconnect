// Builds and sends the platform handover email via Resend, with the account
// sheet and the three role guides attached.
import { readFileSync, writeFileSync } from "node:fs";

const KEY = process.env.RESEND_API_KEY;
if (!KEY) {
  console.error("RESEND_API_KEY is not set.");
  process.exit(1);
}

// --preview sends only to the Resend account owner, which is all an
// unverified domain permits. Drop the flag once sportsconnect.ae is verified
// at resend.com/domains and it goes to the real recipient.
const PREVIEW = process.argv.includes("--preview");

const TO = PREVIEW ? ["zain@following.ae"] : ["daniallilak@outlook.com"];
const CC = PREVIEW ? [] : ["zain@following.ae"];
// The verified domain in Resend is the mail. subdomain, not the apex — the
// apex is what the website answers on, and Resend was set up separately.
const FROM_CANDIDATES = PREVIEW
  ? ["Sportsconnect <onboarding@resend.dev>"]
  : [
      "Sportsconnect <no-reply@mail.sportsconnect.ae>",
      "Sportsconnect <no-reply@sportsconnect.ae>",
      "Sportsconnect <hello@following.ae>",
    ];

const INK = "#14161A";
const INK2 = "#5C616B";
const INK3 = "#9AA0A8";
const VOLT = "#C6F135";
const VOLT_DEEP = "#3C5300";
const SOFT = "#F3F5F1";
const LINE = "#E9ECE6";
const PAPER = "#FBFCF9";
const WARN_BG = "#FBF1DA";
const WARN = "#8A6A12";
const F =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

const pad = (t) => `padding:0 48px;`;

/* --------------------------------------------------------------- pieces */

const spacer = (h) =>
  `<tr><td style="height:${h}px;line-height:${h}px;font-size:0;">&nbsp;</td></tr>`;

const rule = () =>
  `<tr><td style="${pad()}"><div style="height:1px;background:${LINE};line-height:1px;font-size:0;">&nbsp;</div></td></tr>`;

const eyebrow = (t) =>
  `<tr><td style="${pad()}"><p style="margin:0;font-family:${F};font-size:11px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:${INK3};">${t}</p></td></tr>`;

const h2 = (t) =>
  `<tr><td style="${pad()}"><h2 style="margin:10px 0 0 0;font-family:${F};font-size:24px;line-height:1.2;font-weight:800;letter-spacing:-0.6px;color:${INK};">${t}</h2></td></tr>`;

const para = (t, size = 15) =>
  `<tr><td style="${pad()}"><p style="margin:14px 0 0 0;font-family:${F};font-size:${size}px;line-height:1.7;color:${INK2};">${t}</p></td></tr>`;

/** A portal card: icon tile, name, address, one line of purpose. */
const portalCard = (icon, name, url, who) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FFFFFF;border:1px solid ${LINE};border-radius:16px;">
  <tr>
    <td width="56" valign="top" style="padding:20px 0 20px 20px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" width="40" height="40" bgcolor="${VOLT}" style="border-radius:11px;font-size:19px;line-height:40px;">${icon}</td></tr>
      </table>
    </td>
    <td valign="top" style="padding:20px 20px 20px 14px;">
      <p style="margin:0;font-family:${F};font-size:15px;font-weight:800;color:${INK};">${name}</p>
      <p style="margin:4px 0 0 0;font-family:${F};font-size:13px;font-weight:700;color:${VOLT_DEEP};">${url}</p>
      <p style="margin:6px 0 0 0;font-family:${F};font-size:13px;line-height:1.6;color:${INK2};">${who}</p>
    </td>
  </tr>
</table>`;

/** A role block: big number, title, what they do, and the key actions. */
const roleBlock = (n, icon, title, blurb, actions) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SOFT};border-radius:18px;">
  <tr>
    <td style="padding:26px 26px 8px 26px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="42" height="42" align="center" bgcolor="${INK}" style="border-radius:12px;font-size:19px;line-height:42px;">${icon}</td>
          <td style="padding-left:14px;">
            <p style="margin:0;font-family:${F};font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${INK3};">Role ${n}</p>
            <p style="margin:2px 0 0 0;font-family:${F};font-size:19px;font-weight:800;letter-spacing:-0.4px;color:${INK};">${title}</p>
          </td>
        </tr>
      </table>
      <p style="margin:18px 0 0 0;font-family:${F};font-size:14px;line-height:1.7;color:${INK2};">${blurb}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:6px 26px 26px 26px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        ${actions
          .map(
            (a) => `
        <tr>
          <td width="22" valign="top" style="padding:9px 0 0 0;">
            <div style="width:6px;height:6px;background:${VOLT_DEEP};border-radius:3px;"></div>
          </td>
          <td style="padding:4px 0 0 0;">
            <p style="margin:0;font-family:${F};font-size:13.5px;line-height:1.65;color:${INK};"><strong style="font-weight:700;">${a[0]}</strong> <span style="color:${INK2};">${a[1]}</span></p>
          </td>
        </tr>`
          )
          .join("")}
      </table>
    </td>
  </tr>
</table>`;

/** A numbered step in the "start here" walkthrough. */
const step = (n, title, text) => `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td width="40" valign="top" style="padding:0 0 26px 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr><td width="28" height="28" align="center" bgcolor="${VOLT}" style="border-radius:14px;font-family:${F};font-size:12px;font-weight:800;color:${INK};line-height:28px;">${n}</td></tr>
      </table>
    </td>
    <td valign="top" style="padding:0 0 26px 0;">
      <p style="margin:3px 0 0 0;font-family:${F};font-size:15px;font-weight:800;color:${INK};">${title}</p>
      <p style="margin:6px 0 0 0;font-family:${F};font-size:13.5px;line-height:1.7;color:${INK2};">${text}</p>
    </td>
  </tr>
</table>`;

/* ------------------------------------------------------------------ html */

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>Your platform is built and live</title>
<!--[if mso]><style>body,table,td{font-family:Arial,Helvetica,sans-serif !important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Three portals, five sports, and everything you need to run it. Guides attached.</div>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};">
<tr><td align="center" style="padding:40px 16px 64px 16px;">

<table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="width:640px;max-width:100%;background:#FFFFFF;border:1px solid ${LINE};border-radius:24px;">

  <!-- ============ hero ============ -->
  <tr>
    <td style="background:${INK};border-radius:24px 24px 0 0;padding:48px 48px 44px 48px;">
      <p style="margin:0;font-family:${F};font-size:20px;font-weight:800;letter-spacing:-0.6px;color:#FFFFFF;">sports<span style="color:${VOLT};">connect</span></p>
      <h1 style="margin:34px 0 0 0;font-family:${F};font-size:38px;line-height:1.1;font-weight:800;letter-spacing:-1.2px;color:#FFFFFF;">
        Your platform is<br>built and live &#127881;
      </h1>
      <p style="margin:20px 0 0 0;font-family:${F};font-size:16px;line-height:1.7;color:#A7ADB6;max-width:440px;">
        Three portals, five sports, and a full registration and payment flow. Everything below is running right now at sportsconnect.ae.
      </p>
    </td>
  </tr>

  ${spacer(44)}

  <!-- ============ where things live ============ -->
  ${eyebrow("Where everything lives")}
  ${h2("Three doors into one platform")}
  ${para("Same codebase, same database. Which one you get depends on who you sign in as.")}
  ${spacer(24)}
  <tr><td style="${pad()}">
    ${portalCard("&#127967;", "The public site", "www.sportsconnect.ae", "Anyone. Browse events, register, pay.")}
    <div style="height:12px;line-height:12px;font-size:0;">&nbsp;</div>
    ${portalCard("&#128203;", "Organizer portal", "organizer.sportsconnect.ae", "Clubs and organizers. Build and run events.")}
    <div style="height:12px;line-height:12px;font-size:0;">&nbsp;</div>
    ${portalCard("&#9881;&#65039;", "Admin portal", "admin.sportsconnect.ae", "You. Approve everything, control the money.")}
  </td></tr>

  ${spacer(44)}

  <!-- ============ test data ============ -->
  <tr><td style="${pad()}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${WARN_BG};border-radius:16px;">
      <tr>
        <td style="padding:22px 24px;">
          <p style="margin:0;font-family:${F};font-size:15px;font-weight:800;color:${WARN};">&#9888;&#65039;&nbsp; Everything on there is test data</p>
          <p style="margin:10px 0 0 0;font-family:${F};font-size:13.5px;line-height:1.7;color:${WARN};">
            The events, teams, registrations and payments were created for demonstration. Nothing is real and no money has moved.
            Approve, reject, mark paid, refund, cancel &mdash; click anything you like. It is all safe.
          </p>
        </td>
      </tr>
    </table>
  </td></tr>

  ${spacer(48)}
  ${rule()}
  ${spacer(40)}

  <!-- ============ the three roles ============ -->
  ${eyebrow("Who does what")}
  ${h2("Three types of user")}
  ${para("Each one sees a completely different product. A full walkthrough for each is attached as its own PDF.")}
  ${spacer(26)}

  <tr><td style="${pad()}">
    ${roleBlock(
      "01",
      "&#9878;&#65039;",
      "Super Admin",
      "The control room, and the role you will be using. Nothing reaches the public without your approval, and you are the only person who can confirm that money has arrived.",
      [
        ["Approve events.", "Review a submission in full, then approve, request changes, or reject with a note."],
        ["Confirm payments.", "Mark a transfer or cash payment as received. This is locked to you alone."],
        ["Decide refunds.", "Full or partial, with a settlement note recorded against it."],
        ["Create organizers.", "Add a club, tick exactly which permissions they get."],
        ["Configure everything.", "Sports, formats, the platform fee, bank details, policies."],
        ["See everything.", "Revenue and registration reports, plus an audit log of every action taken."],
      ]
    )}
    <div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>
    ${roleBlock(
      "02",
      "&#128221;",
      "Event Admin",
      "The clubs and organizers who actually run events. They build an event through a ten step wizard, submit it to you, then manage everyone who signs up.",
      [
        ["Build events.", "Ten steps, saved as a draft, validated before it can be submitted."],
        ["Manage participants.", "Online registrations plus walk-ins, comps and VIPs added by hand."],
        ["Run squads.", "Captains, players and substitutes, sized to the sport."],
        ["Record cash.", "Mark cash as collected. It then waits for you to confirm it."],
        ["Message people.", "Everyone, or just the confirmed, waitlisted or unpaid."],
      ]
    )}
    <div style="height:14px;line-height:14px;font-size:0;">&nbsp;</div>
    ${roleBlock(
      "03",
      "&#127934;",
      "Consumer",
      "The players. They browse without an account and only need to sign up when they want a place.",
      [
        ["Find events.", "Filter by sport, date, price, skill, gender, age and availability."],
        ["Register.", "Solo or as a team, answering whatever the organizer asked."],
        ["See the full price.", "Entry fee, platform fee, discount and total, before committing."],
        ["Pay their way.", "Bank transfer with a unique reference, or cash at the venue."],
        ["Track it.", "Registrations, payments, receipts, refunds and waitlist position."],
      ]
    )}
  </td></tr>

  ${spacer(48)}
  ${rule()}
  ${spacer(40)}

  <!-- ============ how to use it ============ -->
  ${eyebrow("Start here")}
  ${h2("Your first ten minutes")}
  ${para("The quickest way to understand the platform is to follow one event all the way through, wearing all three hats.")}
  ${spacer(30)}

  <tr><td style="${pad()}">
    ${step("1", "Look at it as a visitor", "Open www.sportsconnect.ae signed out. Browse the events, open one, see what a player sees before they commit to anything.")}
    ${step("2", "Sign in as the organizer", "Use the Event Admin account. Create an event through the ten step builder, then submit it for approval. Notice it stays invisible to the public.")}
    ${step("3", "Sign in as yourself", "Use the Super Admin account. The event is waiting in Approvals. Review it, then approve it. Publish it, then open registration.")}
    ${step("4", "Register as a player", "Back on the public site with the Consumer account, register for that event. Choose bank transfer and read the payment instructions.")}
    ${step("5", "Take the money", "As Super Admin, open Payments. The registration is sitting there unpaid. Mark it paid, and watch the player's place turn to confirmed.")}
    ${step("6", "Try to break it", "Sign in as the organizer and try to mark a payment as paid. You cannot. That rule is enforced in the database, not just hidden in the interface.")}
  </td></tr>

  ${spacer(26)}
  ${rule()}
  ${spacer(40)}

  <!-- ============ attachments ============ -->
  ${eyebrow("Attached")}
  ${h2("Four PDFs")}
  ${spacer(22)}
  <tr><td style="${pad()}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid ${LINE};border-radius:16px;">
      ${[
        ["&#128273;", "Test accounts", "Sign in details for all three roles."],
        ["&#9878;&#65039;", "Super Admin guide", "Approvals, payments, refunds, admins, configuration."],
        ["&#128221;", "Event Admin guide", "The builder, participants, squads, cash, messaging."],
        ["&#127934;", "Consumer guide", "Finding, registering, paying, tracking."],
      ]
        .map(
          ([icon, name, desc], i) => `
      <tr>
        <td style="padding:16px 20px;${i > 0 ? `border-top:1px solid ${LINE};` : ""}">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="34" valign="top" style="font-size:16px;line-height:20px;">${icon}</td>
              <td>
                <p style="margin:0;font-family:${F};font-size:14px;font-weight:700;color:${INK};">${name}</p>
                <p style="margin:3px 0 0 0;font-family:${F};font-size:12.5px;line-height:1.6;color:${INK2};">${desc}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`
        )
        .join("")}
    </table>
  </td></tr>

  ${spacer(20)}
  ${para(
    "The account sheet has the passwords. Keep it somewhere sensible &mdash; those accounts have real control over the live platform.",
    13.5
  )}

  ${spacer(48)}

  <!-- ============ footer ============ -->
  <tr>
    <td style="background:${SOFT};border-radius:0 0 24px 24px;padding:34px 48px;">
      <p style="margin:0;font-family:${F};font-size:15px;font-weight:800;color:${INK};">sports<span style="color:#8FB800;">connect</span></p>
      <p style="margin:10px 0 0 0;font-family:${F};font-size:12.5px;line-height:1.7;color:${INK3};">
        Football &middot; Padel &middot; Cricket &middot; Badminton &middot; Basketball<br>
        Dubai, United Arab Emirates
      </p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;

/* ------------------------------------------------------------------ send */

const attach = (path, filename) => ({
  filename,
  content: readFileSync(path).toString("base64"),
});

const attachments = [
  attach("Sportsconnect-Test-Accounts.pdf", "Sportsconnect - Test Accounts.pdf"),
  attach("Sportsconnect-Guide-Super-Admin.pdf", "Sportsconnect - Super Admin Guide.pdf"),
  attach("Sportsconnect-Guide-Event-Admin.pdf", "Sportsconnect - Event Admin Guide.pdf"),
  attach("Sportsconnect-Guide-Consumer.pdf", "Sportsconnect - Consumer Guide.pdf"),
];

// Keep a copy so the email can be opened in a browser without sending.
writeFileSync("launch-email-preview.html", html, "utf8");

console.log(
  `html ${(html.length / 1024).toFixed(1)} KB, ${attachments.length} attachments ` +
    `(${(attachments.reduce((s, a) => s + a.content.length, 0) / 1024 / 1024).toFixed(2)} MB base64)`
);
console.log(`preview saved to launch-email-preview.html`);
console.log(PREVIEW ? "MODE: preview (owner address only)\n" : "MODE: live send\n");

let sent = false;
for (const from of FROM_CANDIDATES) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: TO,
      cc: CC,
      subject: "Your platform is built and live 🎉",
      html,
      attachments,
    }),
  });

  const body = await res.json();
  if (res.ok) {
    console.log(`SENT from ${from}`);
    console.log(`  id: ${body.id}`);
    console.log(`  to: ${TO.join(", ")}`);
    console.log(`  cc: ${CC.join(", ")}`);
    sent = true;
    break;
  }
  console.log(`  ${from} -> ${res.status} ${JSON.stringify(body).slice(0, 220)}`);
}

if (!sent) {
  console.error("\nCould not send from any candidate sender.");
  process.exit(1);
}
