import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-staff";
import { isExpensePeriod, parseDateOnly } from "@/lib/finance-dates";

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

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const body = await request.json();
    const data: {
      description?: string;
      amount?: number;
      category?: string | null;
      period?: string;
      date?: Date;
    } = {};

    if (typeof body.description === "string") {
      const d = body.description.trim();
      if (!d) {
        return NextResponse.json({ error: "Description is required" }, { status: 400 });
      }
      data.description = d;
    }

    if (body.amount !== undefined) {
      const amount = parseFloat(String(body.amount));
      if (!Number.isFinite(amount) || amount < 0) {
        return NextResponse.json({ error: "A valid amount is required" }, { status: 400 });
      }
      data.amount = amount;
    }

    if (body.category !== undefined) {
      data.category =
        typeof body.category === "string" ? body.category.trim() || null : null;
    }

    if (body.period !== undefined) {
      if (!isExpensePeriod(body.period)) {
        return NextResponse.json({ error: "Invalid period" }, { status: 400 });
      }
      data.period = body.period;
    }

    if (body.date !== undefined) {
      const date = parseDateOnly(body.date);
      if (!date) {
        return NextResponse.json({ error: "Invalid date (YYYY-MM-DD)" }, { status: 400 });
      }
      data.date = date;
    }

    const updated = await prisma.expense.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to update expense" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin(_request);
  if (gate.response) return gate.response;

  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    await prisma.expense.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
