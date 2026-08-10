// Generates the Supabase Auth email templates into supabase/email-templates/.
//
// Email clients are not browsers: Outlook renders with Word, Gmail strips
// <style> in some contexts, and flexbox/grid are unreliable. So these are
// table-based with inline styles, 600px wide, and degrade to a readable
// single column everywhere.
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = "supabase/email-templates";
mkdirSync(OUT, { recursive: true });

const INK = "#14161A";
const INK2 = "#5C616B";
const INK3 = "#9AA0A8";
const VOLT = "#C6F135";
const VOLT_DEEP = "#3C5300";
const SOFT = "#F3F5F1";
const LINE = "#E9ECE6";
const PAPER = "#FBFCF9";

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

/** Wordmark, generous padding, one clear action, nothing else competing. */
function layout({ preheader, title, intro, cta, ctaUrl, body = "", footNote = "" }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${title}</title>
<!--[if mso]><style>body,table,td{font-family:Arial,Helvetica,sans-serif !important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:${PAPER};">

  <!-- preheader: the grey line next to the subject in most inboxes -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"
               style="width:600px;max-width:100%;background:#FFFFFF;border:1px solid ${LINE};border-radius:20px;">

          <!-- wordmark -->
          <tr>
            <td style="padding:40px 48px 0 48px;">
              <span style="font-family:${FONT};font-size:20px;font-weight:800;letter-spacing:-0.6px;color:${INK};">sports</span><span style="font-family:${FONT};font-size:20px;font-weight:800;letter-spacing:-0.6px;color:#8FB800;">connect</span>
            </td>
          </tr>

          <!-- headline -->
          <tr>
            <td style="padding:36px 48px 0 48px;">
              <h1 style="margin:0;font-family:${FONT};font-size:30px;line-height:1.15;font-weight:800;letter-spacing:-0.8px;color:${INK};">${title}</h1>
            </td>
          </tr>

          <!-- intro -->
          <tr>
            <td style="padding:18px 48px 0 48px;">
              <p style="margin:0;font-family:${FONT};font-size:16px;line-height:1.65;color:${INK2};">${intro}</p>
            </td>
          </tr>

          ${
            cta
              ? `<!-- action -->
          <tr>
            <td style="padding:36px 48px 0 48px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" bgcolor="${VOLT}" style="border-radius:14px;">
                    <a href="${ctaUrl}" style="display:inline-block;padding:17px 34px;font-family:${FONT};font-size:16px;font-weight:800;color:${INK};text-decoration:none;border-radius:14px;">${cta}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
              : ""
          }

          ${body}

          <!-- fallback link -->
          ${
            cta
              ? `<tr>
            <td style="padding:34px 48px 0 48px;">
              <p style="margin:0;font-family:${FONT};font-size:13px;line-height:1.6;color:${INK3};">
                Button not working? Paste this into your browser:<br>
                <a href="${ctaUrl}" style="color:${VOLT_DEEP};word-break:break-all;">${ctaUrl}</a>
              </p>
            </td>
          </tr>`
              : ""
          }

          ${
            footNote
              ? `<tr>
            <td style="padding:30px 48px 0 48px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SOFT};border-radius:14px;">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0;font-family:${FONT};font-size:13.5px;line-height:1.6;color:${INK2};">${footNote}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`
              : ""
          }

          <!-- divider + footer -->
          <tr>
            <td style="padding:40px 48px 0 48px;">
              <div style="height:1px;background:${LINE};line-height:1px;font-size:0;">&nbsp;</div>
            </td>
          </tr>
          <tr>
            <td style="padding:22px 48px 40px 48px;">
              <p style="margin:0;font-family:${FONT};font-size:12.5px;line-height:1.6;color:${INK3};">
                Sportsconnect &middot; Dubai, UAE<br>
                Football &middot; Padel &middot; Cricket &middot; Badminton &middot; Basketball
              </p>
            </td>
          </tr>

        </table>

        <p style="margin:22px 0 0 0;font-family:${FONT};font-size:11.5px;color:${INK3};">
          You received this because someone used this address on sportsconnect.ae
        </p>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** A boxed 6-digit code, for the templates where Supabase sends an OTP. */
const codeBlock = (label) => `
          <tr>
            <td style="padding:30px 48px 0 48px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${SOFT};border-radius:16px;">
                <tr>
                  <td align="center" style="padding:26px 20px;">
                    <p style="margin:0 0 10px 0;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:${INK3};">${label}</p>
                    <p style="margin:0;font-family:'SF Mono',Menlo,Consolas,monospace;font-size:34px;font-weight:700;letter-spacing:8px;color:${INK};">{{ .Token }}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>`;

const TEMPLATES = {
  "confirm-signup.html": layout({
    preheader: "Confirm your email and you're in.",
    title: "Confirm your email",
    intro:
      "Welcome to Sportsconnect. Confirm this address and you can start registering for football, padel, cricket, badminton and basketball events across Dubai.",
    cta: "Confirm my email",
    ctaUrl: "{{ .ConfirmationURL }}",
    footNote:
      "This link works once and expires in 24 hours. If you didn't create an account, you can ignore this email and nothing will happen.",
  }),

  "reset-password.html": layout({
    preheader: "Set a new password for your Sportsconnect account.",
    title: "Set a new password",
    intro:
      "Someone asked to reset the password for this account. Choose a new one and you'll be signed straight back in.",
    cta: "Choose a new password",
    ctaUrl: "{{ .ConfirmationURL }}",
    footNote:
      "This link expires in one hour. If you didn't ask for it, ignore this email — your current password stays exactly as it is.",
  }),

  "magic-link.html": layout({
    preheader: "Your sign-in link for Sportsconnect.",
    title: "Your sign-in link",
    intro: "Tap below to sign in. No password needed.",
    cta: "Sign in to Sportsconnect",
    ctaUrl: "{{ .ConfirmationURL }}",
    footNote:
      "This link works once and expires in one hour. If you didn't request it, ignore this email.",
  }),

  "invite.html": layout({
    preheader: "You've been invited to Sportsconnect.",
    title: "You've been invited",
    intro:
      "An administrator has created an account for you on Sportsconnect. Accept the invitation to set your password and get started.",
    cta: "Accept the invitation",
    ctaUrl: "{{ .ConfirmationURL }}",
    footNote:
      "If you weren't expecting this, you can safely ignore it. The invitation expires in 24 hours.",
  }),

  "change-email.html": layout({
    preheader: "Confirm your new email address.",
    title: "Confirm your new address",
    intro:
      "You asked to change the email on your Sportsconnect account to {{ .NewEmail }}. Confirm it below and we'll make the switch.",
    cta: "Confirm the change",
    ctaUrl: "{{ .ConfirmationURL }}",
    footNote:
      "Until you confirm, your account keeps using {{ .Email }}. If you didn't ask for this, ignore the email and nothing changes.",
  }),

  "reauthentication.html": layout({
    preheader: "Your verification code.",
    title: "Your verification code",
    intro: "Enter this code to confirm it's you and finish what you were doing.",
    cta: null,
    ctaUrl: null,
    body: codeBlock("Verification code"),
    footNote: "The code expires in 10 minutes. Never share it with anyone.",
  }),
};

for (const [name, html] of Object.entries(TEMPLATES)) {
  writeFileSync(`${OUT}/${name}`, html, "utf8");
  console.log(`  ${name.padEnd(26)} ${(html.length / 1024).toFixed(1)} KB`);
}

console.log(`\n${Object.keys(TEMPLATES).length} templates written to ${OUT}/`);
