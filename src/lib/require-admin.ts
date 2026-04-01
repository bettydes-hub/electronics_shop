import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type AdminUser = {
  id: string;
  username: string | null;
  email: string;
  name: string;
  role: string;
};

/** Full back-office access: catalog defaults, staff, shop settings. */
function canManageBackOffice(role: string): boolean {
  return role === "ADMIN" || role === "OWNER";
}

/**
 * Requires a signed-in user with role ADMIN or OWNER (shop owner).
 * Sellers cannot manage staff or shop settings.
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ user: AdminUser; response: null } | { user: null; response: NextResponse }> {
  const id = request.headers.get("x-user-id")?.trim();
  if (!id) {
    return { user: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const row = await prisma.user.findUnique({
    where: { id },
    select: { id: true, username: true, email: true, name: true, role: true, staffStatus: true },
  });
  if (!row || row.staffStatus !== "ACTIVE" || !canManageBackOffice(row.role)) {
    return { user: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user: { ...row, role: String(row.role) }, response: null };
}
