import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { STAFF_SITE_SESSION_COOKIE } from "@/lib/staff-session-constants";
import { sessionMayAccessStaffArea, type StaffDashboardArea } from "@/lib/staff-routes";
import { normalizeStaffRole } from "@/lib/staff-session";
import { staffJwtPayloadFromRequest } from "@/lib/staff-session-edge";

function staffAreaFromPath(pathname: string): StaffDashboardArea | null {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "admin";
  if (pathname === "/owner" || pathname.startsWith("/owner/")) return "owner";
  if (pathname === "/seller" || pathname.startsWith("/seller/")) return "seller";
  return null;
}

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

/**
 * CSRF guard for cookie-authenticated staff API writes.
 * We only enforce this when a staff session cookie exists.
 */
function enforceStaffApiCsrf(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/")) return null;
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) return null;
  const hasStaffCookie = Boolean(request.cookies.get(STAFF_SITE_SESSION_COOKIE)?.value?.trim());
  if (!hasStaffCookie) return null;

  const origin = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (!origin || !host) {
    return NextResponse.json({ error: "Forbidden (origin check failed)" }, { status: 403 });
  }

  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    return NextResponse.json({ error: "Forbidden (invalid origin)" }, { status: 403 });
  }
  if (originHost !== host) {
    return NextResponse.json({ error: "Forbidden (cross-site request blocked)" }, { status: 403 });
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const httpsRedirect = redirectHttpToHttps(request);
  if (httpsRedirect) return httpsRedirect;

  const csrfBlock = enforceStaffApiCsrf(request);
  if (csrfBlock) return csrfBlock;

  const { pathname } = request.nextUrl;
  const area = staffAreaFromPath(pathname);
  if (!area) {
    return NextResponse.next();
  }

  const claims = await staffJwtPayloadFromRequest(request);
  const role = claims ? normalizeStaffRole(claims.role) : null;
  if (!role || !sessionMayAccessStaffArea(role, area)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|webp|svg)$).*)",
  ],
};
