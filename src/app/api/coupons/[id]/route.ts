import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.percentOff !== undefined) {
      const v = body.percentOff === null || body.percentOff === "" ? null : parseFloat(String(body.percentOff));
      data.percentOff = v;
    }
    if (body.fixedOff !== undefined) {
      const v = body.fixedOff === null || body.fixedOff === "" ? null : parseFloat(String(body.fixedOff));
      data.fixedOff = v;
    }
    if (body.maxUses !== undefined) {
      data.maxUses =
        body.maxUses === null || body.maxUses === "" ? null : parseInt(String(body.maxUses), 10);
    }
    if (body.minOrderTotal !== undefined) {
      data.minOrderTotal = parseFloat(String(body.minOrderTotal ?? 0));
    }
    if (body.startsAt !== undefined) data.startsAt = body.startsAt ? new Date(body.startsAt) : null;
    if (body.endsAt !== undefined) data.endsAt = body.endsAt ? new Date(body.endsAt) : null;
    if (body.active !== undefined) data.active = Boolean(body.active);

    const row = await prisma.coupon.update({ where: { id }, data });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    await prisma.coupon.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 400 });
  }
}
