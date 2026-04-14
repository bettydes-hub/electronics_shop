import { cookies } from "next/headers";
import { STAFF_SITE_SESSION_COOKIE } from "@/lib/staff-session-constants";
import { signStaffSessionToken, STAFF_SESSION_MAX_AGE_SEC } from "@/lib/staff-session-jwt";

const baseOpts = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

/**
 * Sets the HttpOnly staff session cookie (signed JWT). Use from Route Handlers only.
 */
export async function setStaffSessionCookieInRouteHandler(userId: string, role: string): Promise<void> {
  const token = await signStaffSessionToken(userId, role);
  cookies().set(STAFF_SITE_SESSION_COOKIE, token, {
    ...baseOpts,
    maxAge: STAFF_SESSION_MAX_AGE_SEC,
  });
}

export function clearStaffSessionCookieInRouteHandler(): void {
  cookies().set(STAFF_SITE_SESSION_COOKIE, "", {
    ...baseOpts,
    maxAge: 0,
  });
}
