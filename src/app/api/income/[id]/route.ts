import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-staff";
import { parseDateOnly } from "@/lib/finance-dates";

export async function PATCH(
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

    const existing = await prisma.dailyIncome.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Income not found" }, { status: 404 });
    }

    const body = await request.json();
    const data: { date?: Date; amount?: number; note?: string | null } = {};

    if (body.date !== undefined) {
      const date = parseDateOnly(body.date);
      if (!date) {
        return NextResponse.json({ error: "Invalid date (YYYY-MM-DD)" }, { status: 400 });
      }
      data.date = date;
    }

    if (body.amount !== undefined) {
      const amount = parseFloat(String(body.amount));
      if (!Number.isFinite(amount) || amount < 0) {
        return NextResponse.json({ error: "A valid amount is required" }, { status: 400 });
      }
      data.amount = amount;
    }

    if (body.note !== undefined) {
      data.note = typeof body.note === "string" ? body.note.trim() || null : null;
    }

    const updated = await prisma.dailyIncome.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update income" }, { status: 500 });
  }
}

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

    const existing = await prisma.dailyIncome.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Income not found" }, { status: 404 });
    }

    await prisma.dailyIncome.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete income" }, { status: 500 });
  }
}
