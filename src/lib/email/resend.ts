import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) throw new Error("Missing RESEND_API_KEY");
if (!process.env.RESEND_FROM_EMAIL) throw new Error("Missing RESEND_FROM_EMAIL");

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL;
const APP_URL = process.env.APP_URL ?? "http://localhost:3000";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ─────────────────────────────────────────
// Milestone 2: New candidate submitted
// ─────────────────────────────────────────
export async function sendSubmissionNotification({
  candidateName,
  roleTitle,
  companyName,
  recruiterName,
  recruiterNotes,
  reviewToken,
  hiringManagerEmail,
}: {
  candidateName: string;
  roleTitle: string;
  companyName: string;
  recruiterName: string | null;
  recruiterNotes: string | null;
  reviewToken: string;
  hiringManagerEmail: string;
}) {
  const reviewUrl = `${APP_URL}/review/${reviewToken}`;
  const safeName = escapeHtml(candidateName);
  const safeRole = escapeHtml(roleTitle);
  const safeCompany = escapeHtml(companyName);

  await resend.emails.send({
    from: FROM,
    to: hiringManagerEmail,
    subject: `New candidate for review: ${candidateName} — ${roleTitle}`,
    html: `
      <p>A new candidate has been submitted for <strong>${safeRole}</strong> at ${safeCompany}.</p>
      <table style="border-collapse:collapse;margin:16px 0">
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Candidate</td><td><strong>${safeName}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#6b7280">Role</td><td>${safeRole}</td></tr>
        ${recruiterName ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280">Submitted by</td><td>${escapeHtml(recruiterName)}</td></tr>` : ""}
        ${recruiterNotes ? `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;vertical-align:top">Notes</td><td>${escapeHtml(recruiterNotes)}</td></tr>` : ""}
      </table>
      <p><a href="${reviewUrl}" style="display:inline-block;padding:10px 20px;background:#18181b;color:#fff;text-decoration:none;border-radius:6px">Review Candidate</a></p>
      <p style="color:#9ca3af;font-size:12px">Or copy this link: ${reviewUrl}</p>
    `,
  });
}

// ─────────────────────────────────────────
// Milestone 3: Decision made (placeholder)
// ─────────────────────────────────────────
export async function sendDecisionNotification({
  candidateName,
  decision,
  notes,
  recruiterEmail,
}: {
  candidateName: string;
  decision: string;
  notes: string | null;
  recruiterEmail: string;
}) {
  const decisionLabel =
    decision === "interview"
      ? "move forward to interview"
      : decision === "hold"
        ? "place on hold"
        : "pass at this time";

  await resend.emails.send({
    from: FROM,
    to: recruiterEmail,
    subject: `Update on ${candidateName}`,
    html: `
      <p>The hiring team has reviewed <strong>${escapeHtml(candidateName)}</strong> and decided to <strong>${decisionLabel}</strong>.</p>
      ${notes ? `<p style="color:#374151">${escapeHtml(notes)}</p>` : ""}
    `,
  });
}
