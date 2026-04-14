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

function canManageBackOffice(role: string): boolean {
  const r = normalizeStaffRole(role);
  return r === "ADMIN" || r === "OWNER";
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

/** ADMIN or OWNER — catalog defaults, staff, shop settings, promotions, etc. */
export async function requireAdmin(
  request: NextRequest
): Promise<{ user: StaffUser; response: null } | { user: null; response: NextResponse }> {
  const gate = await requireActiveStaff(request);
  if (gate.response) return gate;
  if (!canManageBackOffice(gate.user.role)) {
    return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user: gate.user, response: null };
}

/** OWNER only — financial dashboard, purchases, expenses, orders. */
export async function requireOwner(
  request: NextRequest
): Promise<{ user: StaffUser; response: null } | { user: null; response: NextResponse }> {
  const gate = await requireActiveStaff(request);
  if (gate.response) return gate;
  if (normalizeStaffRole(gate.user.role) !== "OWNER") {
    return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user: gate.user, response: null };
}

/** SELLER only — floor sales UI. */
export async function requireSeller(
  request: NextRequest
): Promise<{ user: StaffUser; response: null } | { user: null; response: NextResponse }> {
  const gate = await requireActiveStaff(request);
  if (gate.response) return gate;
  if (normalizeStaffRole(gate.user.role) !== "SELLER") {
    return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user: gate.user, response: null };
}

/** OWNER or SELLER — sales list (owner analytics + seller tool). */
export async function requireOwnerOrSeller(
  request: NextRequest
): Promise<{ user: StaffUser; response: null } | { user: null; response: NextResponse }> {
  const gate = await requireActiveStaff(request);
  if (gate.response) return gate;
  const r = normalizeStaffRole(gate.user.role);
  if (r !== "OWNER" && r !== "SELLER") {
    return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user: gate.user, response: null };
}
