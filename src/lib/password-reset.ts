import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/email";
import { normalizeStaffUsername } from "@/lib/staff-invite";

const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour

function tokenDigest(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generatePasswordResetToken(): string {
  return randomBytes(32).toString("hex");
}

const GENERIC_FORGOT_MSG =
  "If an account matches what you entered and has a password, we emailed a reset link to the address on file. Check inbox and spam.";

function emailLooksValid(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

type ForgotInput = { username: string; email: string };

async function findUserForReset(input: ForgotInput) {
  const email = input.email.trim().toLowerCase();
  const usernameNorm = input.username.trim() ? normalizeStaffUsername(input.username) : "";

  if (email && usernameNorm) {
    return prisma.user.findFirst({
      where: { email, username: usernameNorm },
      select: { id: true, email: true, name: true, staffStatus: true, passwordHash: true },
    });
  }
  if (email) {
    return prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, staffStatus: true, passwordHash: true },
    });
  }
  if (usernameNorm) {
    return prisma.user.findUnique({
      where: { username: usernameNorm },
      select: { id: true, email: true, name: true, staffStatus: true, passwordHash: true },
    });
  }
  return null;
}

/**
 * Sends password-reset email to the user's stored email. Username and/or email; at least one required.
 */
export async function requestPasswordReset(
  input: ForgotInput,
  resetUrlBase: string
): Promise<{ ok: true; message: string } | { ok: false; status: number; error: string }> {
  const emailIn = input.email.trim().toLowerCase();
  const userIn = input.username.trim();

  if (!emailIn && !userIn) {
    return { ok: false, status: 400, error: "Enter your username, email, or both." };
  }
  if (emailIn && !emailLooksValid(emailIn)) {
    return { ok: false, status: 400, error: "Enter a valid email address." };
  }

  let user;
  try {
    user = await findUserForReset({ username: input.username, email: input.email });
  } catch (e) {
    console.error("requestPasswordReset find user:", e);
    return {
      ok: false,
      status: 503,
      error:
        "Could not reach the database. If you just deployed, run prisma db push (or migrate) on the server.",
    };
  }

  if (!user?.passwordHash || user.staffStatus !== "ACTIVE") {
    return { ok: true, message: GENERIC_FORGOT_MSG };
  }

  const token = generatePasswordResetToken();
  const digest = tokenDigest(token);

  try {
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenDigest: digest,
          expiresAt: new Date(Date.now() + RESET_TTL_MS),
        },
      }),
    ]);
  } catch (e) {
    console.error("requestPasswordReset token transaction:", e);
    return {
      ok: false,
      status: 503,
      error:
        "Could not save reset token. Try again, or run prisma db push if the database schema is outdated.",
    };
  }

  const link = `${resetUrlBase.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;
  const r = await sendTransactionalEmail(
    user.email,
    "Reset your Electronics Shop password",
    `<p>Hi${user.name ? ` ${escapeHtml(user.name)}` : ""},</p>
<p>We received a request to reset the password for your staff account. Click the link below (valid for one hour):</p>
<p><a href="${escapeHtml(link)}">Reset password</a></p>
<p>If you did not request this, you can ignore this email.</p>
<p style="font-size:12px;color:#64748b">If the button does not work, copy this URL:<br/>${escapeHtml(link)}</p>`
  );

  if (!r.sent) {
    console.error("Password reset email failed:", r.error);
    return {
      ok: false,
      status: 500,
      error: r.error || "Could not send email. Check EMAIL_USER / EMAIL_PASS or SMTP_.",
    };
  }

  return { ok: true, message: GENERIC_FORGOT_MSG };
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function resetPasswordWithToken(
  tokenRaw: string,
  newPassword: string
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const token = typeof tokenRaw === "string" ? tokenRaw.trim() : "";
  if (!token || token.length < 32) {
    return { ok: false, status: 400, error: "Invalid or missing reset link." };
  }
  if (newPassword.length < 8) {
    return { ok: false, status: 400, error: "Password must be at least 8 characters." };
  }

  const digest = tokenDigest(token);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenDigest: digest },
    select: { id: true, userId: true, expiresAt: true },
  });

  if (!row || row.expiresAt.getTime() < Date.now()) {
    return {
      ok: false,
      status: 400,
      error: "This reset link is invalid or has expired. Request a new one from the login page.",
    };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.deleteMany({ where: { userId: row.userId } }),
  ]);

  return { ok: true };
}
