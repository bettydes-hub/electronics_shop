import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { STAFF_SITE_SESSION_COOKIE } from "@/lib/staff-session-constants";

function staffPathNeedsSession(pathname: string): boolean {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  if (pathname === "/owner" || pathname.startsWith("/owner/")) return true;
  if (pathname === "/seller" || pathname.startsWith("/seller/")) return true;
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!staffPathNeedsSession(pathname)) {
    return NextResponse.next();
  }

  const hasStaff = request.cookies.get(STAFF_SITE_SESSION_COOKIE)?.value === "1";
  if (!hasStaff) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/owner", "/owner/:path*", "/seller", "/seller/:path*"],
};
