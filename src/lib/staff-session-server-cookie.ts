import { cookies } from "next/headers";
import { STAFF_SITE_SESSION_COOKIE } from "@/lib/staff-session-constants";

const MAX_AGE_SEC = 60 * 60 * 24 * 30;

const cookieOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE_SEC,
  secure: process.env.NODE_ENV === "production",
};

/**
 * Use inside Route Handlers so Set-Cookie is applied reliably (works better with
 * browser fetch than only mutating NextResponse.cookies in some Next versions).
 */
export function setStaffSiteSessionCookieInRouteHandler(): void {
  cookies().set(STAFF_SITE_SESSION_COOKIE, "1", cookieOpts);
}

export function clearStaffSiteSessionCookieInRouteHandler(): void {
  cookies().set(STAFF_SITE_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    secure: process.env.NODE_ENV === "production",
  });
}
