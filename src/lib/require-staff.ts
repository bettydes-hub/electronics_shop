import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { STAFF_SITE_SESSION_COOKIE } from "@/lib/staff-session-constants";
import { normalizeStaffRole } from "@/lib/staff-session";
import { verifyStaffSessionToken } from "@/lib/staff-session-jwt";

export type StaffUser = {
  id: string;
  username: string | null;
  email: string;
  name: string;
  role: string;
};

function isAdmin(role: string): boolean {
  return normalizeStaffRole(role) === "ADMIN";
}

function tokenFromRequest(request: NextRequest): string | null {
  const v = request.cookies.get(STAFF_SITE_SESSION_COOKIE)?.value?.trim();
  return v || null;
}

export async function requireActiveStaff(
  request: NextRequest
): Promise<{ user: StaffUser; response: null } | { user: null; response: NextResponse }> {
  const token = tokenFromRequest(request);
  if (!token) {
    return { user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const claims = await verifyStaffSessionToken(token);
  if (!claims) {
    return { user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const row = await prisma.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, username: true, email: true, name: true, role: true, staffStatus: true },
  });
  if (!row || row.staffStatus !== "ACTIVE") {
    return { user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const dbRole = String(row.role).toUpperCase();
  if (normalizeStaffRole(claims.role) !== normalizeStaffRole(dbRole)) {
    return { user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return {
    user: {
      id: row.id,
      username: row.username,
      email: row.email,
      name: row.name,
      role: dbRole,
    },
    response: null,
  };
}

/** ADMIN only — catalog, staff, shop settings, finance. */
export async function requireAdmin(
  request: NextRequest
): Promise<{ user: StaffUser; response: null } | { user: null; response: NextResponse }> {
  const gate = await requireActiveStaff(request);
  if (gate.response) return gate;
  if (!isAdmin(gate.user.role)) {
    return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user: gate.user, response: null };
}

/** @deprecated Use requireAdmin — finance is admin-only now. */
export async function requireOwner(
  request: NextRequest
): Promise<{ user: StaffUser; response: null } | { user: null; response: NextResponse }> {
  return requireAdmin(request);
}

/** @deprecated Seller role removed — use requireAdmin. */
export async function requireSeller(
  request: NextRequest
): Promise<{ user: StaffUser; response: null } | { user: null; response: NextResponse }> {
  return requireAdmin(request);
}

/** @deprecated Use requireAdmin. */
export async function requireOwnerOrSeller(
  request: NextRequest
): Promise<{ user: StaffUser; response: null } | { user: null; response: NextResponse }> {
  return requireAdmin(request);
}
