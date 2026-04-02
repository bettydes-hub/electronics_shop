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
    if (body.name !== undefined) data.name = String(body.name).trim();
    if (body.percentOff !== undefined) {
      const pct = parseFloat(String(body.percentOff));
      if (Number.isNaN(pct) || pct <= 0 || pct > 100) {
        return NextResponse.json({ error: "percentOff must be 1–100" }, { status: 400 });
      }
      data.percentOff = pct;
    }
    if (body.startsAt !== undefined) data.startsAt = new Date(body.startsAt);
    if (body.endsAt !== undefined) data.endsAt = new Date(body.endsAt);
    if (body.isFlashSale !== undefined) data.isFlashSale = Boolean(body.isFlashSale);
    if (body.active !== undefined) data.active = Boolean(body.active);

    const row = await prisma.promotion.update({
      where: { id },
      data,
      include: { product: { select: { id: true, name: true } }, categoryRef: { select: { id: true, name: true } } },
    });
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
    await prisma.promotion.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Delete failed" }, { status: 400 });
  }
}
