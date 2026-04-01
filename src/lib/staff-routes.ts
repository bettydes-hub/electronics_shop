import { normalizeStaffRole } from "@/lib/staff-session";

export type StaffDashboardArea = "admin" | "owner" | "seller";

function pathOnly(url: string): string {
  const i = url.indexOf("?");
  return i >= 0 ? url.slice(0, i) : url;
}

/** Primary back-office home for this role (post-login default). */
export function dashboardPathForRole(role: string | null): string {
  const r = normalizeStaffRole(role);
  if (r === "ADMIN") return "/admin";
  if (r === "OWNER") return "/owner";
  if (r === "SELLER") return "/seller";
  return "/catalog";
}

/** Profile URL scoped to the staff area for this role. */
export function profilePathForRole(role: string | null): string {
  const r = normalizeStaffRole(role);
  if (r === "ADMIN") return "/admin/profile";
  if (r === "OWNER") return "/owner/profile";
  if (r === "SELLER") return "/seller/profile";
  return "/catalog";
}

export function parseStaffArea(segment: string): StaffDashboardArea | null {
  const s = segment.toLowerCase();
  if (s === "admin" || s === "owner" || s === "seller") return s;
  return null;
}

/**
 * Admin panel: ADMIN and OWNER. Owner dashboard: OWNER only. Seller: SELLER only.
 */
export function sessionMayAccessStaffArea(
  sessionRole: string | null,
  area: StaffDashboardArea
): boolean {
  const r = normalizeStaffRole(sessionRole);
  if (!r) return false;
  if (area === "admin") return r === "ADMIN" || r === "OWNER";
  if (area === "owner") return r === "OWNER";
  return r === "SELLER";
}

function roleMayAccessPathPrefix(role: string | null, pathNoQuery: string): boolean {
  const r = normalizeStaffRole(role);
  if (!r) return false;
  if (pathNoQuery === "/admin" || pathNoQuery.startsWith("/admin/")) {
    return r === "ADMIN" || r === "OWNER";
  }
  if (pathNoQuery === "/owner" || pathNoQuery.startsWith("/owner/")) {
    return r === "OWNER";
  }
  if (pathNoQuery === "/seller" || pathNoQuery.startsWith("/seller/")) {
    return r === "SELLER";
  }
  if (pathNoQuery === "/hub" || pathNoQuery.startsWith("/hub/")) return true;
  if (pathNoQuery === "/catalog" || pathNoQuery.startsWith("/catalog/")) return true;
  if (pathNoQuery === "/cart" || pathNoQuery.startsWith("/cart/")) return true;
  if (pathNoQuery === "/checkout" || pathNoQuery.startsWith("/checkout/")) return true;
  if (pathNoQuery === "/customer" || pathNoQuery.startsWith("/customer/")) return true;
  if (
    pathNoQuery.startsWith("/login") ||
    pathNoQuery.startsWith("/register") ||
    pathNoQuery.startsWith("/forgot-password") ||
    pathNoQuery.startsWith("/reset-password") ||
    pathNoQuery.startsWith("/setup")
  ) {
    return true;
  }
  return false;
}

/**
 * After login, validate `next` so users cannot jump into another role's URLs.
 * Preserves query string when the path is allowed.
 */
export function safeNextPathAfterLogin(next: string | null | undefined, role: string): string {
  const home = dashboardPathForRole(role);
  if (!next || typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) {
    return home;
  }
  const r = normalizeStaffRole(role);
  if (!r) return home;

  const po = pathOnly(next);

  if (po === "/profile" || po.startsWith("/profile/")) {
    return profilePathForRole(r);
  }

  if (roleMayAccessPathPrefix(r, po)) {
    return next;
  }
  return home;
}
