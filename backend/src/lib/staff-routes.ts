import { normalizeStaffRole } from "@/lib/staff-session";

export type StaffDashboardArea = "admin";

function pathOnly(url: string): string {
  const i = url.indexOf("?");
  return i >= 0 ? url.slice(0, i) : url;
}

/** Primary back-office home for this role (post-login default). */
export function dashboardPathForRole(role: string | null): string {
  const r = normalizeStaffRole(role);
  if (r === "ADMIN") return "/admin";
  return "/catalog";
}

/** Profile URL scoped to the staff area for this role. */
export function profilePathForRole(role: string | null): string {
  const r = normalizeStaffRole(role);
  if (r === "ADMIN") return "/admin/profile";
  return "/catalog";
}

export function parseStaffArea(segment: string): StaffDashboardArea | null {
  const s = segment.toLowerCase();
  if (s === "admin") return s;
  return null;
}

/**
 * Strict dashboard area routing per role.
 */
export function sessionMayAccessStaffArea(
  sessionRole: string | null,
  area: StaffDashboardArea
): boolean {
  const r = normalizeStaffRole(sessionRole);
  if (!r) return false;
  if (area === "admin") return r === "ADMIN";
  return false;
}

function roleMayAccessPathPrefix(role: string | null, pathNoQuery: string): boolean {
  const r = normalizeStaffRole(role);
  if (!r) return false;
  if (pathNoQuery === "/admin" || pathNoQuery.startsWith("/admin/")) {
    return r === "ADMIN";
  }
  if (
    pathNoQuery.startsWith("/login") ||
    pathNoQuery.startsWith("/register") ||
    pathNoQuery.startsWith("/forgot-password") ||
    pathNoQuery.startsWith("/reset-password") ||
    pathNoQuery.startsWith("/setup")
  ) {
    return true;
  }
  if (pathNoQuery === "/catalog" || pathNoQuery.startsWith("/catalog/")) return true;
  return false;
}

/**
 * After login, validate `next` so users cannot jump into another role's URLs.
 * Preserves query string when the path is allowed.
 */
/**
 * After login, validate `next` so users cannot jump into disallowed URLs.
 * Call as safeNextPathAfterLogin(nextParam, role).
 */
export function safeNextPathAfterLogin(nextRaw: string | null | undefined, role: string | null): string {
  const fallback = dashboardPathForRole(role);
  if (!nextRaw || typeof nextRaw !== "string") return fallback;
  const trimmed = nextRaw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return fallback;
  const path = pathOnly(trimmed);
  if (!roleMayAccessPathPrefix(role, path)) return fallback;
  return trimmed;
}
