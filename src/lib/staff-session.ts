/** Client-only: reads `localStorage` set by staff login. Import only from client components. */

export { STAFF_SITE_SESSION_COOKIE } from "@/lib/staff-session-constants";

export type StaffSessionInfo = {
  id: string | null;
  role: string | null;
  username: string | null;
};

const STORAGE_KEY = "user";

export function normalizeStaffRole(raw: unknown): string | null {
  if (typeof raw === "string") {
    const u = raw.trim().toUpperCase();
    return u || null;
  }
  if (raw != null && raw !== "") {
    const u = String(raw).trim().toUpperCase();
    return u || null;
  }
  return null;
}

/** ADMIN and OWNER can manage staff and store settings. Sellers cannot. */
export function canManageStaff(role: string | null): boolean {
  const r = normalizeStaffRole(role);
  return r === "ADMIN" || r === "OWNER";
}

export function readStaffSession(): StaffSessionInfo {
  if (typeof window === "undefined") {
    return { id: null, role: null, username: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const u = raw ? JSON.parse(raw) : null;
    const idRaw = u?.id;
    const id = idRaw != null && String(idRaw).trim() ? String(idRaw).trim() : null;
    const role = normalizeStaffRole(u?.role);
    const username =
      typeof u?.username === "string" && u.username.trim()
        ? u.username.trim()
        : typeof u?.name === "string" && u.name.trim()
          ? u.name.trim()
          : null;
    return { id, role, username };
  } catch {
    return { id: null, role: null, username: null };
  }
}

/** Clears localStorage and the HttpOnly staff cookie (via /api/auth/logout). */
export async function clearStaffSession(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch {
    /* still clear local session */
  }
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
