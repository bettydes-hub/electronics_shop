import type { NextRequest } from "next/server";
import { STAFF_SITE_SESSION_COOKIE } from "@/lib/staff-session-constants";

function secretBytes(): Uint8Array {
  const raw = process.env.STAFF_SESSION_SECRET?.trim();
  if (process.env.NODE_ENV === "production" && (!raw || raw.length < 32)) {
    return new Uint8Array(0);
  }
  const key =
    raw && raw.length >= 8
      ? raw
      : "dev-staff-session-secret-min-32-chars-do-not-use-in-prod!!";
  return new TextEncoder().encode(key.slice(0, 256));
}

function base64UrlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * HS256 JWT verify using Web Crypto (Edge-safe). Must stay in sync with `staff-session-jwt.ts`.
 */
export async function verifyStaffJwtEdge(token: string): Promise<{ sub: string; role: string } | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h64, p64, sig64] = parts;
  const secret = secretBytes();
  if (secret.length === 0 && process.env.NODE_ENV === "production") return null;
  const data = new Uint8Array(new TextEncoder().encode(`${h64}.${p64}`));
  const signature = new Uint8Array(base64UrlToBytes(sig64));
  const rawKey = Uint8Array.from(secret);
  let key: CryptoKey;
  try {
    key = await crypto.subtle.importKey("raw", rawKey, { name: "HMAC", hash: "SHA-256" }, false, [
      "verify",
    ]);
  } catch {
    return null;
  }
  const ok = await crypto.subtle.verify("HMAC", key, signature, data);
  if (!ok) return null;
  let payload: { sub?: string; role?: string; exp?: number };
  try {
    const json = new TextDecoder().decode(base64UrlToBytes(p64));
    payload = JSON.parse(json) as { sub?: string; role?: string; exp?: number };
  } catch {
    return null;
  }
  if (typeof payload.exp === "number" && payload.exp * 1000 < Date.now()) return null;
  const sub = typeof payload.sub === "string" ? payload.sub.trim() : "";
  const role = typeof payload.role === "string" ? payload.role.trim().toUpperCase() : "";
  if (!sub || !role) return null;
  return { sub, role };
}

export async function staffJwtPayloadFromRequest(
  request: NextRequest
): Promise<{ sub: string; role: string } | null> {
  const token = request.cookies.get(STAFF_SITE_SESSION_COOKIE)?.value?.trim();
  if (!token) return null;
  return verifyStaffJwtEdge(token);
}
