import { SignJWT, jwtVerify } from "jose";

const ALG = "HS256";
const MAX_AGE_SEC = 60 * 60 * 24 * 30;

function secretKey(): Uint8Array {
  const raw = process.env.STAFF_SESSION_SECRET?.trim();
  if (process.env.NODE_ENV === "production" && (!raw || raw.length < 32)) {
    throw new Error("STAFF_SESSION_SECRET must be set to at least 32 characters in production.");
  }
  const key =
    raw && raw.length >= 8
      ? raw
      : "dev-staff-session-secret-min-32-chars-do-not-use-in-prod!!";
  return new TextEncoder().encode(key.slice(0, 256));
}

export type StaffJwtPayload = { sub: string; role: string };

export async function signStaffSessionToken(userId: string, role: string): Promise<string> {
  const roleNorm = String(role).trim().toUpperCase();
  return new SignJWT({ role: roleNorm })
    .setProtectedHeader({ alg: ALG })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(secretKey());
}

export async function verifyStaffSessionToken(token: string): Promise<StaffJwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: [ALG] });
    const sub = typeof payload.sub === "string" ? payload.sub.trim() : "";
    const role = typeof payload.role === "string" ? payload.role.trim().toUpperCase() : "";
    if (!sub || !role) return null;
    return { sub, role };
  } catch {
    return null;
  }
}

export { MAX_AGE_SEC as STAFF_SESSION_MAX_AGE_SEC };
