import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-staff";
import {
  isExpensePeriod,
  parseDateOnly,
  todayUtcDate,
} from "@/lib/finance-dates";

export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  try {
    const expenses = await prisma.expense.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });
    return NextResponse.json(expenses);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  try {
    const body = await request.json();
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    const amount = parseFloat(String(body.amount ?? ""));
    const category =
      typeof body.category === "string" ? body.category.trim() || null : null;
    const periodVal = isExpensePeriod(body.period) ? body.period : "MONTHLY";
    const date = parseDateOnly(body.date) ?? todayUtcDate();

    if (!description) {
      return NextResponse.json({ error: "Description is required" }, { status: 400 });
    }
    if (!Number.isFinite(amount) || amount < 0) {
      return NextResponse.json({ error: "A valid amount is required" }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        description,
        amount,
        category,
        period: periodVal,
        date,
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to record expense" }, { status: 500 });
  }
}
