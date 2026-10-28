import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { STAFF_SITE_SESSION_COOKIE } from "@/lib/staff-session-constants";

/** When TLS terminates at the edge (e.g. Vercel), upgrade plain HTTP requests. */
function redirectHttpToHttps(request: NextRequest): NextResponse | null {
  if (process.env.ENFORCE_HTTPS_REDIRECT === "false") return null;
  const enabled = process.env.VERCEL === "1" || process.env.ENFORCE_HTTPS_REDIRECT === "true";
  if (!enabled) return null;
  if (request.headers.get("x-forwarded-proto") !== "http") return null;
  const host = request.headers.get("host") ?? "";
  if (/^(127\.0\.0\.1|localhost)(:\d+)?$/i.test(host)) return null;
  const url = request.nextUrl.clone();
  url.protocol = "https:";
  return NextResponse.redirect(url, 308);
}

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function allowedHosts(request: NextRequest): string[] {
  const hosts: string[] = [];
  const forwarded = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");
  if (forwarded) hosts.push(forwarded);
  if (host) hosts.push(host);
  const frontendOrigin = process.env.FRONTEND_ORIGIN?.trim();
  if (frontendOrigin) {
    try {
      hosts.push(new URL(frontendOrigin).host);
    } catch {
      /* ignore invalid FRONTEND_ORIGIN */
    }
  }
  return hosts;
}

/**
 * CSRF guard for cookie-authenticated staff API writes.
 * The shop UI is a separate origin and proxies /api here, so the browser
 * origin (FRONTEND_ORIGIN) is allowed in addition to this server's host.
 */
function enforceStaffApiCsrf(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/")) return null;
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) return null;
  const hasStaffCookie = Boolean(request.cookies.get(STAFF_SITE_SESSION_COOKIE)?.value?.trim());
  if (!hasStaffCookie) return null;

  const origin = request.headers.get("origin");
  const hosts = allowedHosts(request);
  if (!origin || hosts.length === 0) {
    return NextResponse.json({ error: "Forbidden (origin check failed)" }, { status: 403 });
  }

  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    return NextResponse.json({ error: "Forbidden (invalid origin)" }, { status: 403 });
  }
  if (!hosts.includes(originHost)) {
    return NextResponse.json({ error: "Forbidden (cross-site request blocked)" }, { status: 403 });
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const httpsRedirect = redirectHttpToHttps(request);
  if (httpsRedirect) return httpsRedirect;

  const csrfBlock = enforceStaffApiCsrf(request);
  if (csrfBlock) return csrfBlock;

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
