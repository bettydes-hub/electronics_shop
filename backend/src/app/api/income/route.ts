import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-staff";
import { parseDateOnly, todayUtcDate } from "@/lib/finance-dates";

export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  try {
    const rows = await prisma.dailyIncome.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch income" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  try {
    const body = await request.json();
    const amount = parseFloat(String(body.amount ?? ""));
    const note = typeof body.note === "string" ? body.note.trim() || null : null;
    const date = parseDateOnly(body.date) ?? todayUtcDate();

    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: "A valid amount is required" }, { status: 400 });
    }

    const row = await prisma.dailyIncome.create({
      data: {
        date,
        amount,
        note,
        createdById: gate.user.id,
      },
    });
    return NextResponse.json(row);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to record income" }, { status: 500 });
  }
}
