import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/require-staff";

export async function GET(request: NextRequest) {
  const gate = await requireOwner(request);
  if (gate.response) return gate.response;
  try {
    const expenses = await prisma.expense.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(expenses);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

const PERIODS = ["WEEKLY", "MONTHLY", "THREE_MONTHS", "SIX_MONTHS", "YEARLY"] as const;

export async function POST(request: NextRequest) {
  const gate = await requireOwner(request);
  if (gate.response) return gate.response;
  try {
    const body = await request.json();
    const { description, amount, category, period } = body;

    if (!description || amount === undefined) {
      return NextResponse.json(
        { error: "Description and amount are required" },
        { status: 400 }
      );
    }

    const periodVal =
      typeof period === "string" && PERIODS.includes(period as (typeof PERIODS)[number])
        ? period
        : "MONTHLY";

    const expense = await prisma.expense.create({
      data: {
        description,
        amount: parseFloat(amount),
        category: category || null,
        period: periodVal,
      },
    });

    return NextResponse.json(expense);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to record expense" },
      { status: 500 }
    );
  }
}
