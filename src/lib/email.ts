import nodemailer from "nodemailer";

/** Gmail passwords with @ are sometimes pasted as %40 (URL encoding). Nodemailer needs the real character. */
function normalizeMailPassword(raw: string): string {
  const t = raw.trim();
  if (!t.includes("%")) return t;
  try {
    return decodeURIComponent(t);
  } catch {
    return t;
  }
}

function genericSmtpConfigured(): boolean {
  return Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USERNAME?.trim() &&
      process.env.SMTP_PASSWORD?.trim()
  );
}

function legacyGmailConfigured(): boolean {
  return Boolean(process.env.EMAIL_USER?.trim() && process.env.EMAIL_PASS?.trim());
}

function mailErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err && typeof (err as { message: string }).message === "string") {
    return (err as { message: string }).message;
  }
  return "Failed to send email";
}

async function sendViaGenericSmtp(
  to: string,
  subject: string,
  html: string
): Promise<{ sent: boolean; error?: string }> {
  const host = process.env.SMTP_HOST!.trim();
  const user = process.env.SMTP_USERNAME!.trim();
  const pass = normalizeMailPassword(process.env.SMTP_PASSWORD!);
  const port = parseInt(process.env.SMTP_PORT || "465", 10);
  const fromAddr = process.env.FROM_EMAIL?.trim() || user;

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: `"Electronics Shop" <${fromAddr}>`,
      to,
      subject,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error("SMTP error:", err);
    return { sent: false, error: mailErrorMessage(err) };
  }
}

async function sendViaLegacyGmail(
  to: string,
  subject: string,
  html: string
): Promise<{ sent: boolean; error?: string }> {
  const user = process.env.EMAIL_USER!.trim();
  const pass = normalizeMailPassword(process.env.EMAIL_PASS!);
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
    });
    await transporter.sendMail({
      from: `"Electronics Shop" <${user}>`,
      to,
      subject,
      html,
    });
    return { sent: true };
  } catch (err) {
    console.error("Gmail SMTP error:", err);
    return { sent: false, error: mailErrorMessage(err) };
  }
}

/**
 * Order: SMTP_* (any provider) → EMAIL_USER + EMAIL_PASS (Gmail shortcut).
 */
export async function sendTransactionalEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ sent: boolean; error?: string }> {
  if (genericSmtpConfigured()) {
    return sendViaGenericSmtp(to, subject, html);
  }

  if (legacyGmailConfigured()) {
    return sendViaLegacyGmail(to, subject, html);
  }

  return {
    sent: false,
    error:
      "No email transport configured. Set SMTP_HOST, SMTP_USERNAME, SMTP_PASSWORD (and optional FROM_EMAIL), or EMAIL_USER + EMAIL_PASS.",
  };
}
