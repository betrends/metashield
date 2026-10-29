// Beautiful HTML email templates for client recovery notifications.
// Each template uses inline styles for maximum email client compatibility.

const BRAND_PURPLE = "#6d28d9";
const BRAND_LIGHT = "#ede9fe";
const BRAND_DARK = "#1e1b4b";
const BG = "#f5f3ff";
const WHITE = "#ffffff";
const TEXT_DARK = "#1e293b";
const TEXT_MID = "#475569";
const TEXT_LIGHT = "#94a3b8";
const GREEN = "#16a34a";
const GREEN_BG = "#dcfce7";

// Every value interpolated into these templates can come from a client
// (names, case titles, messages, file names), so all string inputs are
// HTML-escaped once, at the top of each template, via escapeOpts().
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeOpts<T extends Record<string, unknown>>(opts: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(opts)) {
    if (typeof value === "string") out[key] = escapeHtml(value);
    else if (Array.isArray(value)) out[key] = value.map((v) => (typeof v === "string" ? escapeHtml(v) : v));
    else out[key] = value;
  }
  return out as T;
}

// Only http(s) links may be rendered as links/images.
function safeUrl(url: string | null | undefined): string | null {
  return url && /^https?:\/\//i.test(url) ? url : null;
}

function wrapper(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>MetaShield</title>
</head>
<body style="margin:0;padding:0;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:${BRAND_PURPLE};border-radius:16px 16px 0 0;padding:28px 40px;text-align:center;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center">
                  <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:12px;padding:10px 14px;margin-bottom:12px;">
                    <span style="color:${WHITE};font-size:20px;">🛡️</span>
                  </div>
                  <div style="color:${WHITE};font-size:22px;font-weight:700;letter-spacing:-0.3px;">MetaShield</div>
                  <div style="color:rgba(255,255,255,0.75);font-size:13px;margin-top:4px;">Account Recovery &amp; Protection</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="background:${WHITE};padding:40px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
            <p style="margin:0;color:${TEXT_LIGHT};font-size:12px;line-height:1.6;">
              This email was sent by MetaShield on behalf of your recovery team.<br/>
              We will <strong>never</strong> ask for your social media password.
            </p>
            <p style="margin:12px 0 0;color:${TEXT_LIGHT};font-size:11px;">
              © ${new Date().getFullYear()} MetaShield · All rights reserved
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function statusBadge(label: string, color: string, bg: string) {
  return `<span style="display:inline-block;background:${bg};color:${color};font-size:11px;font-weight:700;letter-spacing:0.6px;text-transform:uppercase;padding:4px 12px;border-radius:999px;">${label}</span>`;
}

function ctaButton(text: string, href: string) {
  return `<table cellpadding="0" cellspacing="0" style="margin:24px 0;">
    <tr>
      <td style="background:${BRAND_PURPLE};border-radius:10px;padding:0;">
        <a href="${href}" style="display:inline-block;color:${WHITE};font-size:15px;font-weight:600;padding:14px 28px;text-decoration:none;letter-spacing:-0.2px;">
          ${text} →
        </a>
      </td>
    </tr>
  </table>`;
}

function divider() {
  return `<hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;"/>`;
}

function infoRow(label: string, value: string) {
  return `<tr>
    <td style="padding:8px 0;color:${TEXT_MID};font-size:13px;width:40%;">${label}</td>
    <td style="padding:8px 0;color:${TEXT_DARK};font-size:13px;font-weight:600;">${value}</td>
  </tr>`;
}

const PORTAL_URL = process.env.NEXT_PUBLIC_APP_URL || "https://account-recovery-platform.vercel.app";

// ─── Document submission email (team notification) ─────────────────────────

// 6. Team notification — client submitted documents
export function documentsSubmittedEmail(opts: {
  clientName: string;
  clientEmail: string;
  fileCount: number;
  fileNames: string[];
  caseTitle?: string | null;
}) {
  const { clientName, clientEmail, fileCount, fileNames, caseTitle } = escapeOpts(opts);
  const adminUrl = `${PORTAL_URL}/admin`;
  return wrapper(`
    <div style="margin-bottom:8px;">${statusBadge("Documents Submitted", BRAND_PURPLE, BRAND_LIGHT)}</div>
    <h1 style="margin:16px 0 8px;color:${BRAND_DARK};font-size:24px;font-weight:700;line-height:1.3;">
      📎 ${fileCount} document${fileCount !== 1 ? "s" : ""} submitted by ${clientName}
    </h1>
    <p style="margin:0 0 24px;color:${TEXT_MID};font-size:15px;line-height:1.7;">
      A client has submitted documents through the portal. These are now available to download and review.
    </p>

    <div style="background:#f8fafc;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${infoRow("Client", clientName)}
        ${infoRow("Email", clientEmail)}
        ${caseTitle ? infoRow("Case", caseTitle) : ""}
        ${infoRow("Files submitted", String(fileCount))}
      </table>
    </div>

    ${fileNames.length > 0 ? `
    <h2 style="margin:0 0 10px;color:${TEXT_DARK};font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Files</h2>
    <ul style="margin:0 0 24px;padding:0;list-style:none;">
      ${fileNames.map(name => `
      <li style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;">
        <span style="color:${BRAND_PURPLE};font-size:16px;">📄</span>
        <span style="color:${TEXT_DARK};font-size:13px;">${name}</span>
      </li>`).join("")}
    </ul>
    ` : ""}

    ${ctaButton("View in Admin Dashboard", adminUrl)}

    <p style="margin:0;color:${TEXT_LIGHT};font-size:12px;">
      This is an internal notification. You can reply to the client from the admin messaging panel.
    </p>
  `);
}

// ─── Contact form emails ────────────────────────────────────────────────────

// 6. Team notification — new contact/inquiry received
export function contactNotificationEmail(opts: {
  source: string;
  name: string;
  email: string;
  phone?: string | null;
  message?: string | null;
  platform?: string | null;
  screenshotUrl?: string | null;
}) {
  const { source, name, email, phone, message, platform, screenshotUrl: rawScreenshotUrl } = escapeOpts(opts);
  const screenshotUrl = safeUrl(rawScreenshotUrl);
  const sourceLabel: Record<string, string> = {
    contact_form: "Contact Form",
    health_check: "Account Health Check",
    recovery_eligibility: "Recovery Eligibility Checker",
    payment_receipt: "Payment Receipt",
  };
  const label = sourceLabel[source] ?? source;

  return wrapper(`
    <div style="margin-bottom:8px;">${statusBadge("New Inquiry", BRAND_PURPLE, BRAND_LIGHT)}</div>
    <h1 style="margin:16px 0 8px;color:${BRAND_DARK};font-size:24px;font-weight:700;line-height:1.3;">
      📩 New submission via ${label}
    </h1>
    <p style="margin:0 0 24px;color:${TEXT_MID};font-size:15px;line-height:1.7;">
      Someone has reached out through the website. Reply directly from this email (reply-to is set to their address).
    </p>

    <div style="background:#f8fafc;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${infoRow("Name", name)}
        ${infoRow("Email", email)}
        ${phone ? infoRow("Phone / WhatsApp", phone) : ""}
        ${platform ? infoRow("Platform", platform) : ""}
        ${infoRow("Source", label)}
      </table>
    </div>

    ${message ? `
    <h2 style="margin:0 0 10px;color:${TEXT_DARK};font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Their message</h2>
    <div style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:${TEXT_DARK};font-size:14px;line-height:1.8;white-space:pre-wrap;">${message}</p>
    </div>
    ` : ""}

    ${screenshotUrl ? `
    <h2 style="margin:0 0 10px;color:${TEXT_DARK};font-size:14px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">Error Screenshot</h2>
    <div style="margin-bottom:24px;">
      <a href="${screenshotUrl}" target="_blank" style="display:block;">
        <img src="${screenshotUrl}" alt="Client error screenshot" style="max-width:100%;border-radius:8px;border:1px solid #e2e8f0;display:block;" />
      </a>
      <p style="margin:8px 0 0;font-size:12px;color:${TEXT_LIGHT};">
        <a href="${screenshotUrl}" target="_blank" style="color:${BRAND_PURPLE};">Open full image →</a>
      </p>
    </div>
    ` : ""}

    ${ctaButton(`Reply to ${name}`, `mailto:${email}?subject=Re: Your MetaShield inquiry`)}

    <p style="margin:0;color:${TEXT_LIGHT};font-size:12px;">
      This is an internal notification. Do not forward to the client.
    </p>
  `);
}

// 7. Client auto-reply — confirms we received their message
export function contactAutoReplyEmail(opts: {
  name: string;
}) {
  const { name } = escapeOpts(opts);
  return wrapper(`
    <div style="margin-bottom:8px;">${statusBadge("Message Received", GREEN, GREEN_BG)}</div>
    <h1 style="margin:16px 0 8px;color:${BRAND_DARK};font-size:24px;font-weight:700;line-height:1.3;">
      ✅ We've got your message, ${name.split(" ")[0]}!
    </h1>
    <p style="margin:0 0 24px;color:${TEXT_MID};font-size:15px;line-height:1.7;">
      Thanks for reaching out to <strong>MetaShield</strong>. Your message has been received and a member of our team will follow up with you within <strong>24 hours</strong>.
    </p>

    <div style="background:${BRAND_LIGHT};border-left:4px solid ${BRAND_PURPLE};border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:${BRAND_PURPLE};font-size:14px;font-weight:600;">What happens next?</p>
      <p style="margin:6px 0 0;color:#4c1d95;font-size:13px;line-height:1.7;">
        Our team will review your message and get back to you with an assessment of your situation. You do not need to send another message.
      </p>
    </div>

    <table cellpadding="0" cellspacing="0" width="100%">
      ${[
        ["⏱️", "Response time", "Typically within 24 hours, often faster."],
        ["🔒", "Your privacy", "We will never ask for your social media password."],
        ["📊", "While you wait", "Check your account health score for free using our online tool."],
      ].map(([icon, title, desc]) => `
        <tr>
          <td style="padding:10px 0;vertical-align:top;width:36px;"><span style="font-size:20px;">${icon}</span></td>
          <td style="padding:10px 0 10px 12px;">
            <div style="color:${TEXT_DARK};font-size:14px;font-weight:600;margin-bottom:2px;">${title}</div>
            <div style="color:${TEXT_MID};font-size:13px;line-height:1.6;">${desc}</div>
          </td>
        </tr>
      `).join("")}
    </table>

    ${ctaButton("Check My Account Health — Free", `${PORTAL_URL}/check-my-account`)}

    <p style="margin:0;color:${TEXT_LIGHT};font-size:12px;">
      If you sent this by mistake, no action is needed — simply ignore this email.
    </p>
  `);
}

// 1. Case submitted + agent assigned
export function caseSubmittedEmail(opts: {
  clientName: string;
  caseTitle: string;
  agentName?: string | null;
  agentPhone?: string | null;
}) {
  const { clientName, caseTitle, agentName, agentPhone } = escapeOpts(opts);
  return wrapper(`
    <div style="margin-bottom:8px;">${statusBadge("Case Received", BRAND_PURPLE, BRAND_LIGHT)}</div>
    <h1 style="margin:16px 0 8px;color:${BRAND_DARK};font-size:24px;font-weight:700;line-height:1.3;">
      Your recovery case is in! 🎉
    </h1>
    <p style="margin:0 0 24px;color:${TEXT_MID};font-size:15px;line-height:1.7;">
      Hi <strong>${clientName}</strong>, we've received your case and our team is on it.
      Here's a summary of what happens next.
    </p>

    <div style="background:${BG};border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${infoRow("Case", caseTitle)}
        ${agentName ? infoRow("Assigned agent", agentName) : ""}
        ${agentPhone ? infoRow("Agent phone", agentPhone) : ""}
        ${infoRow("Status", "Awaiting payment")}
      </table>
    </div>

    ${divider()}

    <h2 style="margin:0 0 16px;color:${TEXT_DARK};font-size:16px;font-weight:700;">What happens next?</h2>
    <table cellpadding="0" cellspacing="0" width="100%">
      ${[
        ["💳", "Pay the recovery fee", "Head to your portal and pay the case fee to unlock recovery work."],
        ["🔍", "Agent begins work", `${agentName || "Your agent"} will start the recovery process immediately after payment is confirmed.`],
        ["📲", "Stay updated", "You'll receive email updates at every stage. Track live in your portal."],
      ].map(([icon, title, desc]) => `
        <tr>
          <td style="padding:10px 0;vertical-align:top;width:36px;">
            <span style="font-size:20px;">${icon}</span>
          </td>
          <td style="padding:10px 0 10px 12px;">
            <div style="color:${TEXT_DARK};font-size:14px;font-weight:600;margin-bottom:2px;">${title}</div>
            <div style="color:${TEXT_MID};font-size:13px;line-height:1.6;">${desc}</div>
          </td>
        </tr>
      `).join("")}
    </table>

    ${ctaButton("Go to my portal", `${PORTAL_URL}/portal`)}

    <p style="margin:0;color:${TEXT_LIGHT};font-size:12px;">
      Questions? Reply to this email or message your agent directly in the portal.
    </p>
  `);
}

// 2. Payment / receipt received
export function receiptReceivedEmail(opts: { clientName: string; caseTitle: string }) {
  const { clientName, caseTitle } = escapeOpts(opts);
  return wrapper(`
    <div style="margin-bottom:8px;">${statusBadge("Payment Received", GREEN, GREEN_BG)}</div>
    <h1 style="margin:16px 0 8px;color:${BRAND_DARK};font-size:24px;font-weight:700;line-height:1.3;">
      Payment receipt received ✅
    </h1>
    <p style="margin:0 0 24px;color:${TEXT_MID};font-size:15px;line-height:1.7;">
      Hi <strong>${clientName}</strong>, we've received your payment receipt for <strong>${caseTitle}</strong>.
      Our team is reviewing and confirming it now — this usually takes just a few minutes.
    </p>

    <div style="background:${GREEN_BG};border-left:4px solid ${GREEN};border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:${GREEN};font-size:14px;font-weight:600;">
        ✅ Receipt submitted successfully
      </p>
      <p style="margin:6px 0 0;color:#166534;font-size:13px;line-height:1.6;">
        You'll receive another email as soon as your payment is confirmed and recovery work begins.
      </p>
    </div>

    ${divider()}

    <h2 style="margin:0 0 12px;color:${TEXT_DARK};font-size:15px;font-weight:700;">What happens after confirmation?</h2>
    <p style="margin:0 0 24px;color:${TEXT_MID};font-size:14px;line-height:1.7;">
      Once your payment is confirmed, your assigned agent will begin active work on recovering your account.
      You'll receive a notification and can track all progress live in your client portal.
    </p>

    ${ctaButton("Track my case", `${PORTAL_URL}/portal/cases`)}
  `);
}

// 3. Agent assigned
export function agentAssignedEmail(opts: {
  clientName: string;
  caseTitle: string;
  agentName: string;
  agentPhone?: string | null;
}) {
  const { clientName, caseTitle, agentName, agentPhone } = escapeOpts(opts);
  return wrapper(`
    <div style="margin-bottom:8px;">${statusBadge("Agent Assigned", "#7c3aed", "#ede9fe")}</div>
    <h1 style="margin:16px 0 8px;color:${BRAND_DARK};font-size:24px;font-weight:700;line-height:1.3;">
      Meet your recovery agent 👋
    </h1>
    <p style="margin:0 0 24px;color:${TEXT_MID};font-size:15px;line-height:1.7;">
      Hi <strong>${clientName}</strong>, great news! <strong>${agentName}</strong> has been assigned
      to your case and will be handling your recovery personally.
    </p>

    <div style="background:${BRAND_LIGHT};border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
      <div style="width:52px;height:52px;background:${BRAND_PURPLE};border-radius:999px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
        <span style="color:white;font-size:22px;font-weight:700;">${agentName[0]}</span>
      </div>
      <div style="color:${BRAND_DARK};font-size:16px;font-weight:700;">${agentName}</div>
      <div style="color:${TEXT_MID};font-size:13px;margin-top:4px;">Recovery Specialist · MetaShield</div>
      ${agentPhone ? `<div style="margin-top:8px;color:${BRAND_PURPLE};font-size:13px;font-weight:600;">📞 ${agentPhone}</div>` : ""}
    </div>

    <table cellpadding="0" cellspacing="0" width="100%">
      ${infoRow("Case", caseTitle)}
      ${infoRow("Agent", agentName)}
      ${agentPhone ? infoRow("Direct contact", agentPhone) : ""}
    </table>

    ${divider()}

    <p style="margin:0 0 24px;color:${TEXT_MID};font-size:14px;line-height:1.7;">
      You can message ${agentName} directly from your portal at any time. They'll keep you updated
      as your recovery progresses.
    </p>

    ${ctaButton("Message my agent", `${PORTAL_URL}/portal/messages`)}
  `);
}

// 4. Stage changed
export function stageChangedEmail(opts: {
  clientName: string;
  caseTitle: string;
  stage: string;
  agentName?: string | null;
}) {
  const { clientName, caseTitle, stage, agentName } = escapeOpts(opts);

  const stageConfig: Record<string, { emoji: string; color: string; bg: string; message: string }> = {
    "Getting Started": { emoji: "🚀", color: "#7c3aed", bg: "#ede9fe", message: "Your case is now active and recovery work is beginning." },
    "Under Review": { emoji: "🔍", color: "#d97706", bg: "#fef3c7", message: "Our team is reviewing your case details and platform evidence." },
    "Recovery Process": { emoji: "⚙️", color: "#2563eb", bg: "#dbeafe", message: "Active recovery work is underway. Your agent is working on it now." },
    "Awaiting Platform Response": { emoji: "⏳", color: "#7c3aed", bg: "#ede9fe", message: "We're waiting for the platform to respond. This can take a few days." },
    "Recovered": { emoji: "🎉", color: GREEN, bg: GREEN_BG, message: "Excellent news — your account has been successfully recovered!" },
    "Closed": { emoji: "📁", color: "#64748b", bg: "#f1f5f9", message: "Your case has been closed. Contact us if you need further support." },
  };

  const cfg = stageConfig[stage] ?? { emoji: "📋", color: BRAND_PURPLE, bg: BRAND_LIGHT, message: "Your case has been updated." };

  return wrapper(`
    <div style="margin-bottom:8px;">${statusBadge("Case Update", cfg.color, cfg.bg)}</div>
    <h1 style="margin:16px 0 8px;color:${BRAND_DARK};font-size:24px;font-weight:700;line-height:1.3;">
      ${cfg.emoji} Case update: ${stage}
    </h1>
    <p style="margin:0 0 24px;color:${TEXT_MID};font-size:15px;line-height:1.7;">
      Hi <strong>${clientName}</strong>, here's the latest on your recovery case.
    </p>

    <div style="background:${cfg.bg};border-left:4px solid ${cfg.color};border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <div style="color:${cfg.color};font-size:15px;font-weight:700;margin-bottom:4px;">${stage}</div>
      <p style="margin:0;color:${TEXT_MID};font-size:14px;line-height:1.6;">${cfg.message}</p>
    </div>

    <div style="background:#f8fafc;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${infoRow("Case", caseTitle)}
        ${infoRow("New stage", stage)}
        ${agentName ? infoRow("Your agent", agentName) : ""}
      </table>
    </div>

    ${stage === "Recovered" ? `
      <div style="background:${GREEN_BG};border-radius:12px;padding:20px 24px;margin-bottom:24px;text-align:center;">
        <div style="font-size:40px;margin-bottom:8px;">🎊</div>
        <div style="color:${GREEN};font-size:18px;font-weight:700;">Account Successfully Recovered!</div>
        <p style="margin:8px 0 0;color:#166534;font-size:14px;line-height:1.6;">
          Your account has been restored. Thank you for trusting MetaShield.
        </p>
      </div>
    ` : ""}

    ${ctaButton("View full case details", `${PORTAL_URL}/portal/cases`)}

    <p style="margin:0;color:${TEXT_LIGHT};font-size:12px;">
      ${agentName ? `Questions? Message ${agentName} directly in the portal.` : "Questions? Message us in the portal."}
    </p>
  `);
}

// 5. Payment confirmed — recovery work starting
export function paymentConfirmedEmail(opts: {
  clientName: string;
  caseTitle: string;
  agentName?: string | null;
}) {
  const { clientName, caseTitle, agentName } = escapeOpts(opts);
  return wrapper(`
    <div style="margin-bottom:8px;">${statusBadge("Payment Confirmed", GREEN, GREEN_BG)}</div>
    <h1 style="margin:16px 0 8px;color:${BRAND_DARK};font-size:24px;font-weight:700;line-height:1.3;">
      Payment confirmed — recovery starts now! 🚀
    </h1>
    <p style="margin:0 0 24px;color:${TEXT_MID};font-size:15px;line-height:1.7;">
      Hi <strong>${clientName}</strong>, your payment has been confirmed!
      ${agentName ? `<strong>${agentName}</strong> is now actively working on your case.` : "Your agent is now actively working on your case."}
    </p>

    <div style="background:${GREEN_BG};border-left:4px solid ${GREEN};border-radius:8px;padding:16px 20px;margin-bottom:24px;">
      <p style="margin:0;color:${GREEN};font-size:14px;font-weight:600;">✅ Payment confirmed &amp; recovery underway</p>
      <p style="margin:6px 0 0;color:#166534;font-size:13px;line-height:1.6;">
        Case: <strong>${caseTitle}</strong>
      </p>
    </div>

    <h2 style="margin:0 0 16px;color:${TEXT_DARK};font-size:15px;font-weight:700;">What to expect:</h2>
    <table cellpadding="0" cellspacing="0" width="100%">
      ${[
        ["📬", "Regular updates", "You'll receive email updates at every stage of the recovery process."],
        ["💬", "Direct messaging", `Message ${agentName || "your agent"} anytime from your portal.`],
        ["📊", "Live tracking", "Track every step in real-time from your client dashboard."],
        ["⏱️", "Timeline", "The process can take up to 9 weeks, depending on the case and Meta's review timeline."],
      ].map(([icon, title, desc]) => `
        <tr>
          <td style="padding:10px 0;vertical-align:top;width:36px;"><span style="font-size:20px;">${icon}</span></td>
          <td style="padding:10px 0 10px 12px;">
            <div style="color:${TEXT_DARK};font-size:14px;font-weight:600;margin-bottom:2px;">${title}</div>
            <div style="color:${TEXT_MID};font-size:13px;line-height:1.6;">${desc}</div>
          </td>
        </tr>
      `).join("")}
    </table>

    ${ctaButton("Track my recovery", `${PORTAL_URL}/portal/cases`)}
  `);
}

// ─── Subscription welcome email ─────────────────────────────────────────────

export function subscriptionWelcomeEmail(opts: {
  clientName: string;
  planName: string;
  planPrice: string;
  priceSuffix: string;
  features: string[];
  renewsOn: string | null;
}) {
  const { clientName, planName, planPrice, priceSuffix, features, renewsOn } = escapeOpts(opts);
  const firstName = clientName.split(" ")[0];
  return wrapper(`
    <div style="margin-bottom:8px;">${statusBadge("Package Active", GREEN, GREEN_BG)}</div>
    <h1 style="margin:16px 0 8px;color:${BRAND_DARK};font-size:24px;font-weight:700;line-height:1.3;">
      Welcome to ${planName}, ${firstName}! 🛡️
    </h1>
    <p style="margin:0 0 24px;color:${TEXT_MID};font-size:15px;line-height:1.7;">
      Your package is active. Eligible recoveries covered by your plan have no recovery fee — here's what's included.
    </p>

    <div style="background:${BRAND_LIGHT};border-radius:12px;padding:20px 24px;margin-bottom:24px;">
      <div style="display:flex;align-items:baseline;gap:8px;margin-bottom:16px;">
        <span style="color:${BRAND_PURPLE};font-size:22px;font-weight:700;">${planPrice}</span>
        <span style="color:#6d28d9;font-size:14px;">${priceSuffix}</span>
      </div>
      <ul style="margin:0;padding:0;list-style:none;">
        ${features.map(f => `
        <li style="display:flex;align-items:center;gap:10px;padding:6px 0;color:#4c1d95;font-size:14px;">
          <span style="color:${GREEN};font-weight:700;font-size:16px;">✓</span>
          ${f}
        </li>`).join("")}
      </ul>
    </div>

    ${renewsOn ? `
    <p style="margin:0 0 24px;color:${TEXT_MID};font-size:14px;">
      📅 Active until: <strong>${new Date(renewsOn).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</strong>
    </p>
    ` : ""}

    <table cellpadding="0" cellspacing="0" width="100%">
      ${[
        ["🛡️", "Recovery included", "Open a recovery case for an account your plan covers — no recovery fee and no deposit."],
        ["🧭", "Guidance at every step", "We guide you through the recovery, review and appeal processes available to you."],
        ["💬", "Direct access", "Message or call your agent from your portal."],
        ["ℹ️", "Good to know", "Recovery and appeal approval aren't guaranteed — Meta makes the final decisions."],
      ].map(([icon, title, desc]) => `
        <tr>
          <td style="padding:10px 0;vertical-align:top;width:36px;"><span style="font-size:20px;">${icon}</span></td>
          <td style="padding:10px 0 10px 12px;">
            <div style="color:${TEXT_DARK};font-size:14px;font-weight:600;margin-bottom:2px;">${title}</div>
            <div style="color:${TEXT_MID};font-size:13px;line-height:1.6;">${desc}</div>
          </td>
        </tr>
      `).join("")}
    </table>

    ${ctaButton("Go to my portal", `${PORTAL_URL}/portal`)}

    <p style="margin:0;color:${TEXT_LIGHT};font-size:12px;">
      You can manage or cancel your subscription anytime from the Billing section of your portal.
    </p>
  `);
}

// Final 50% balance is due (sent when recovery completion is recorded).
export function balanceDueEmail(opts: {
  clientName: string;
  caseTitle: string;
  balance: string;
  deadline: string;
  overdue?: boolean;
}) {
  const { clientName, caseTitle, balance, deadline } = escapeOpts(opts);
  const overdue = !!opts.overdue;
  return wrapper(`
    <div style="margin-bottom:8px;">${statusBadge(overdue ? "Balance Overdue" : "Balance Due", BRAND_PURPLE, BRAND_LIGHT)}</div>
    <h1 style="margin:16px 0 8px;color:${BRAND_DARK};font-size:24px;font-weight:700;line-height:1.3;">
      ${overdue ? "Your final balance is overdue" : "Your recovery is complete 🎉"}
    </h1>
    <p style="margin:0 0 24px;color:${TEXT_MID};font-size:15px;line-height:1.7;">
      Hi <strong>${clientName}</strong>, ${
        overdue
          ? `the remaining balance for <strong>${caseTitle}</strong> was due by <strong>${deadline}</strong>.`
          : `your case <strong>${caseTitle}</strong> has been completed successfully.`
      }
      The remaining 50% of your recovery fee, <strong>${balance}</strong>, ${overdue ? "is now overdue" : `is due by <strong>${deadline}</strong> (24 hours from completion)`}.
    </p>
    <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:24px;">
      ${infoRow("Balance due", balance)}
      ${infoRow("Deadline", deadline)}
    </table>
    <p style="margin:0 0 24px;color:${TEXT_MID};font-size:14px;line-height:1.7;">
      Pay by bank transfer and upload your receipt from your case page.
    </p>
    ${ctaButton("Pay my balance", `${PORTAL_URL}/portal/cases`)}
  `);
}

// Short internal alert to the team (NOTIFY_EMAIL).
export function staffAlertEmail(opts: { title: string; lines: string[]; link?: string | null }) {
  const title = escapeHtml(opts.title);
  const lines = opts.lines.map(escapeHtml);
  return wrapper(`
    <h1 style="margin:0 0 16px;color:${BRAND_DARK};font-size:20px;font-weight:700;line-height:1.3;">${title}</h1>
    ${lines.map((l) => `<p style="margin:0 0 8px;color:${TEXT_MID};font-size:14px;line-height:1.6;">${l}</p>`).join("")}
    ${opts.link ? ctaButton("Open in admin", `${PORTAL_URL}${opts.link}`) : ""}
  `);
}




// Package renewal reminder: a few days before it ends, and when it ends.
export function packageRenewalEmail(opts: {
  name: string;
  planName: string;
  price: string;
  priceSuffix: string;
  endsOn: string;
  kind: "ending_soon" | "ended";
  renewUrl: string;
}) {
  const { name, planName, price, priceSuffix } = escapeOpts({
    name: opts.name,
    planName: opts.planName,
    price: opts.price,
    priceSuffix: opts.priceSuffix,
  });
  const renewUrl = escapeHtml(opts.renewUrl);
  const date = new Date(opts.endsOn).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  const ended = opts.kind === "ended";
  return wrapper(`
    <div style="margin-bottom:8px;">${statusBadge(ended ? "Package ended" : "Renewal reminder", ended ? "#b42318" : BRAND_PURPLE, ended ? "#fdecea" : BRAND_LIGHT)}</div>
    <h1 style="margin:16px 0 8px;color:${BRAND_DARK};font-size:22px;font-weight:700;line-height:1.3;">
      ${ended ? `Your ${planName} package has ended` : `Your ${planName} package ends on ${date}`}
    </h1>
    <p style="margin:0 0 16px;color:${TEXT_MID};font-size:15px;line-height:1.7;">
      Hi ${name.split(" ")[0] || "there"}, ${
        ended
          ? `your package ended on <strong>${date}</strong>. Until you renew, new recovery cases are charged the normal recovery fee.`
          : `renew before <strong>${date}</strong> to keep account recovery at no extra recovery fee. Renewing early adds the new period on top — you don't lose any days.`
      }
    </p>
    <p style="margin:0 0 20px;color:${TEXT_DARK};font-size:15px;"><strong>${planName}</strong> · ${price}${priceSuffix ? ` ${priceSuffix}` : ""}</p>
    ${ctaButton("Renew now", renewUrl)}
    <p style="margin:16px 0 0;color:${TEXT_LIGHT};font-size:12px;line-height:1.6;">
      You'll pay securely by card through Korapay. Questions? Reply to this email or contact us at ${PORTAL_URL}/contact.
    </p>
  `);
}

// ── Follow-up emails (eligibility check, account health check) ──────────
// Honest urgency only: real reasons to act now, no invented deadlines,
// no guarantees.

function preheader(text: string) {
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${text}</div>`;
}

function urgencyHero(chip: string, chipColor: string, headline: string, sub: string) {
  return `
    <div style="background:linear-gradient(135deg,#1e1b4b 0%,#4c1d95 100%);background-color:#1e1b4b;border-radius:14px;padding:28px 26px;margin:0 0 24px;">
      <span style="display:inline-block;background:${chipColor};color:#ffffff;font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;border-radius:999px;padding:6px 12px;">${chip}</span>
      <h1 style="margin:16px 0 10px;color:#ffffff;font-size:26px;font-weight:800;line-height:1.25;">${headline}</h1>
      <p style="margin:0;color:#ddd6fe;font-size:15px;line-height:1.6;">${sub}</p>
    </div>`;
}

function iconList(title: string, items: string[], icon: string, color: string) {
  return `
    <p style="margin:0 0 10px;color:${TEXT_DARK};font-size:15px;font-weight:800;">${title}</p>
    <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 22px;">
      ${items
        .map(
          (t) => `
      <tr>
        <td style="width:28px;vertical-align:top;padding:6px 0;color:${color};font-size:16px;font-weight:800;">${icon}</td>
        <td style="vertical-align:top;padding:6px 0;color:${TEXT_MID};font-size:14px;line-height:1.6;">${t}</td>
      </tr>`
        )
        .join("")}
    </table>`;
}

function bigButton(text: string, href: string) {
  return `
    <table cellpadding="0" cellspacing="0" width="100%" style="margin:6px 0 22px;">
      <tr><td align="center" style="background:${BRAND_PURPLE};border-radius:12px;">
        <a href="${href}" style="display:block;padding:17px 24px;color:#ffffff;font-size:17px;font-weight:800;text-decoration:none;">${text}</a>
      </td></tr>
    </table>`;
}

// Sent the morning after someone checked their recovery eligibility (and
// left "email me" ticked) but hasn't opened a case. No prices.
export function eligibilityFollowupSubject(opts: { name: string; platform?: string | null; final?: boolean }) {
  const first = opts.name.split(" ")[0] || "";
  if (opts.final) return `Last reminder: ${first ? `${first}, still` : "still"} want your ${opts.platform || "account"} back?`;
  return `⏳ ${first ? `${first}, don't` : "Don't"} let your ${opts.platform || "account"} go for good`;
}

export function eligibilityFollowupEmail(opts: {
  name: string;
  platform?: string | null;
  issue?: string | null;
  unsubscribeUrl: string;
  final?: boolean; // the second and last reminder, 3 days after the first
}) {
  const { name, platform, issue } = escapeOpts({ name: opts.name, platform: opts.platform ?? "", issue: opts.issue ?? "" });
  const unsubscribeUrl = escapeHtml(opts.unsubscribeUrl);
  const first = name.split(" ")[0] || "there";
  const acct = platform ? `${platform} account` : "account";
  return wrapper(`
    ${preheader(
      opts.final
        ? "This is our last email about your eligibility check. Meta's appeal window doesn't stay open forever."
        : "Meta only gives a limited time to appeal. It takes about 2 minutes to start your case."
    )}
    ${
      opts.final
        ? urgencyHero(
            "Last reminder",
            "#dc2626",
            `${first}, still locked out of your ${acct}?`,
            `This is the last time we'll email you about your eligibility check${issue ? ` (<strong style="color:#ffffff;">${issue}</strong>)` : ""}. If you still want your account back, don't leave it any longer — starting your case takes about 2 minutes.`
          )
        : urgencyHero(
            "⏳ Time matters",
            "#dc2626",
            `${first}, your ${acct} isn't gone yet. But the clock is running.`,
            `You checked your recovery eligibility with MetaShield${issue ? ` (<strong style="color:#ffffff;">${issue}</strong>)` : ""}, and your situation looked like a case we can work on. The sooner it's submitted, the better.`
          )
    }
    ${iconList(
      "Every day you wait:",
      [
        "Meta's window to appeal a disabled account keeps closing — once it closes, the account can be gone for good.",
        "Your followers, customers and messages go unanswered.",
        "Scammers and impersonators can use your name while you're locked out.",
      ],
      "✕",
      "#dc2626"
    )}
    ${iconList(
      "What MetaShield does for you:",
      [
        "We prepare and submit your case through the available Meta support channels.",
        "Your own agent keeps you updated at every step — message or call them any time.",
        "You pay a 50% deposit to start. The other 50% is only due after a successful recovery.",
      ],
      "✓",
      "#16a34a"
    )}
    ${bigButton("Start my recovery now →", `${PORTAL_URL}/recovery-eligibility`)}
    <p style="margin:0 0 16px;color:${TEXT_DARK};font-size:14px;line-height:1.7;">
      <strong>P.S.</strong> ${
        opts.final
          ? "We won't email you about this again — if you need us later, we're one message away."
          : "Waiting rarely brings a disabled account back on its own. It takes about 2 minutes to start your case."
      }
    </p>
    <p style="margin:0;color:${TEXT_LIGHT};font-size:12px;line-height:1.6;">
      An eligibility check does not guarantee recovery — the final decision remains with Meta.
      Questions? Reply to this email or contact us at ${PORTAL_URL}/contact.
    </p>
    <p style="margin:12px 0 0;color:${TEXT_LIGHT};font-size:11px;">
      You received this because you asked us to email you about your eligibility result.
      <a href="${unsubscribeUrl}" style="color:${TEXT_LIGHT};">Unsubscribe</a>
    </p>
  `);
}

// Sent the morning after someone ran the account health check (and left
// "email me" ticked) but has no package yet: the Account Protection packages.
export function protectionFollowupSubject(opts: { name: string; handle?: string | null; riskLevel?: string | null; final?: boolean }) {
  const first = opts.name.split(" ")[0] || "";
  const acct = opts.handle || "your account";
  if (opts.final) return `Last reminder: account recovery at no extra cost for ${acct}`;
  return opts.riskLevel === "high" || opts.riskLevel === "medium"
    ? `⚠️ Risk found on ${acct} — get account recovery at no extra cost`
    : `${first ? `${first}, if` : "If"} ${acct} is ever hacked or disabled, we recover it at no extra cost`;
}

export function protectionFollowupEmail(opts: {
  name: string;
  platform?: string | null;
  handle?: string | null;
  riskLevel?: string | null;
  unsubscribeUrl: string;
  final?: boolean; // the second and last reminder, 3 days after the first
}) {
  const { name, platform, handle } = escapeOpts({ name: opts.name, platform: opts.platform ?? "", handle: opts.handle ?? "" });
  const unsubscribeUrl = escapeHtml(opts.unsubscribeUrl);
  const first = name.split(" ")[0] || "there";
  const acct = handle || (platform ? `your ${platform} account` : "your account");
  const risky = opts.riskLevel === "high" || opts.riskLevel === "medium";
  const pkg = (n: string, price: string, covers: string, tag = "") => `
      <tr>
        <td style="padding:12px 14px;border:1px solid #ede9fe;border-radius:10px;background:#faf8ff;">
          <table cellpadding="0" cellspacing="0" width="100%"><tr>
            <td style="color:${TEXT_DARK};font-size:15px;font-weight:800;">${n}${
              tag ? ` <span style="font-size:10px;font-weight:800;color:${BRAND_PURPLE};background:#ede9fe;border-radius:999px;padding:3px 8px;margin-left:4px;">${tag}</span>` : ""
            }<div style="color:${TEXT_MID};font-size:12px;font-weight:400;margin-top:3px;">${covers}</div></td>
            <td align="right" style="color:${BRAND_PURPLE};font-size:15px;font-weight:800;white-space:nowrap;">${price}</td>
          </tr></table>
        </td>
      </tr>
      <tr><td style="height:8px;"></td></tr>`;
  return wrapper(`
    ${preheader("One subscription. Account recovery at no extra cost — from ₦10,000/month.")}
    ${urgencyHero(
      opts.final ? "Last reminder" : risky ? "⚠️ Risk found on your account" : "🛡️ Account recovery at no extra cost",
      opts.final || risky ? "#dc2626" : "#7c3aed",
      opts.final
        ? `${first}, ${acct} is still unprotected. Account recovery at no extra cost is one step away.`
        : `${first}, if ${acct} is ever hacked or disabled, we recover it — at no extra cost.`,
      `One MetaShield subscription protects your account <strong style="color:#ffffff;">and</strong> covers account recovery at no extra recovery fee.${
        risky ? ` <strong style="color:#ffffff;">Your health check flagged risk factors on this account — don't wait for something to go wrong.</strong>` : ""
      }`
    )}
    ${iconList(
      "Accounts are hacked, mass-reported and disabled every day. Without protection:",
      [
        "You're locked out of your followers, customers and DMs — overnight.",
        "Every day offline costs you sales, reach and trust.",
        "You pay for recovery on top of everything you've already lost.",
      ],
      "✕",
      "#dc2626"
    )}
    ${iconList(
      "With a MetaShield package:",
      [
        "<strong>Account recovery at no extra cost</strong> for eligible cases covered by your plan.",
        "A monthly account security check to catch problems early.",
        "Guidance through every available recovery and appeal process.",
      ],
      "✓",
      "#16a34a"
    )}
    <p style="margin:0 0 10px;color:${TEXT_DARK};font-size:15px;font-weight:800;">Pick your package — recovery included in every one:</p>
    <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 14px;">
      ${pkg("Watch", "₦10,000/mo", "Instagram + Facebook")}
      ${pkg("Elite", "₦15,000/mo", "Instagram + Facebook + Meta ad account")}
      ${pkg("Annual Plan", "₦120,000/yr", "2 Instagram + 2 Facebook")}
      ${pkg("Lifetime Plan", "₦500,000 once", "Instagram + Facebook + Meta ad account", "No renewals")}
    </table>
    ${bigButton("Get recovery at no extra cost →", `${PORTAL_URL}/pricing#packages`)}
    <p style="margin:0 0 16px;color:${TEXT_DARK};font-size:14px;line-height:1.7;">
      <strong>P.S.</strong> ${
        opts.final
          ? "This is the last email about your account check. Protection only works if it's in place <em>before</em> something goes wrong."
          : "Protection only works if it's in place <em>before</em> something goes wrong. From ₦10,000/month, recovery is covered — no extra cost."
      }
    </p>
    <p style="margin:0;color:${TEXT_LIGHT};font-size:12px;line-height:1.6;">
      Account recovery is provided at no additional recovery service fee for eligible cases covered by your plan.
      Recovery, appeal approval and restriction removal are not guaranteed — Meta makes the final decisions.
    </p>
    <p style="margin:12px 0 0;color:${TEXT_LIGHT};font-size:11px;">
      You received this because you asked us to email you about your account check.
      <a href="${unsubscribeUrl}" style="color:${TEXT_LIGHT};">Unsubscribe</a>
    </p>
  `);
}
