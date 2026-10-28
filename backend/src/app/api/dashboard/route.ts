import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-staff";
import { sumAllIncome } from "@/lib/finance-income";

export async function GET(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  try {
    const [income, expenses] = await Promise.all([
      sumAllIncome(),
      prisma.expense.aggregate({ _sum: { amount: true } }),
    ]);

    const expenseTotal = expenses._sum.amount || 0;
    const profit = income.incomeTotal - expenseTotal;

    return NextResponse.json({
      incomeTotal: income.incomeTotal,
      salesTotal: income.salesTotal,
      otherIncomeTotal: income.otherIncomeTotal,
      expenseTotal,
      totalRevenue: income.incomeTotal,
      totalCost: expenseTotal,
      profit,
      purchaseTotal: 0,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
