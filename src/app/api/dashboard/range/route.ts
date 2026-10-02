import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-staff";
import { parseDateOnly } from "@/lib/finance-dates";
import { sumIncomeInRange } from "@/lib/finance-income";

export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;

  try {
    const { searchParams } = request.nextUrl;
    const from = parseDateOnly(searchParams.get("from"));
    const to = parseDateOnly(searchParams.get("to"));

    if (!from || !to) {
      return NextResponse.json(
        { error: "from and to dates are required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }
    if (from.getTime() > to.getTime()) {
      return NextResponse.json(
        { error: "Start date must be on or before end date" },
        { status: 400 }
      );
    }

    const [income, expenses] = await Promise.all([
      sumIncomeInRange(from, to),
      prisma.expense.aggregate({
        _sum: { amount: true },
        where: { date: { gte: from, lte: to } },
      }),
    ]);

    const expenseTotal = expenses._sum.amount || 0;
    const profit = income.incomeTotal - expenseTotal;

    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });

    return NextResponse.json({
      from: from.toISOString().slice(0, 10),
      to: to.toISOString().slice(0, 10),
      label: `${fmt(from)} – ${fmt(to)}`,
      incomeTotal: income.incomeTotal,
      salesTotal: income.salesTotal,
      otherIncomeTotal: income.otherIncomeTotal,
      expenseTotal,
      profit,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to calculate range" }, { status: 500 });
  }
}
