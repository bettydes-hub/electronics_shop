import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;

  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    if (gate.user.id === id) {
      return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, staffStatus: true },
    });
    if (!target) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (target.role === "ADMIN" && target.staffStatus === "ACTIVE") {
      const adminCount = await prisma.user.count({
        where: { role: "ADMIN", staffStatus: "ACTIVE" },
      });
      if (adminCount <= 1) {
        return NextResponse.json(
          { error: "Cannot delete the last active admin account" },
          { status: 400 }
        );
      }
    }

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
