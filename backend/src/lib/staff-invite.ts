import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/email";

function random6Digit(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Replace any previous codes, store new hash, send plain code by email. */
export async function createInviteCodeAndSendEmail(
  userId: string,
  email: string
): Promise<{ sent: boolean; error?: string }> {
  await prisma.staffInviteCode.deleteMany({ where: { userId } });
  const code = random6Digit();
  const codeHash = await bcrypt.hash(code, 8);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await prisma.staffInviteCode.create({
    data: { userId, codeHash, expiresAt },
  });
  return sendTransactionalEmail(
    email.trim(),
    "Your shop invite code - Electronics Shop",
    `<p>Your verification code:</p><p style="font-size:1.25rem;font-weight:bold;letter-spacing:0.15em">${code}</p><p>It expires in 15 minutes. Open your shop&apos;s registration page to choose your username and password.</p>`
  );
}

export function normalizeStaffUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidStaffUsername(username: string): boolean {
  return /^[a-z0-9._-]{3,32}$/.test(username);
}
