import type { NextRequest } from "next/server";

/** Base URL for links in emails (password reset, etc.). */
export function getPublicOrigin(request: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;

  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    return `${proto}://${host}`;
  }

  return request.nextUrl.origin;
}
