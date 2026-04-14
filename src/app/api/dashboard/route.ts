import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/require-staff";

export async function GET(request: NextRequest) {
  const gate = await requireOwner(request);
  if (gate.response) return gate.response;
  try {
    const [purchases, expenses, sales] = await Promise.all([
      prisma.purchase.aggregate({ _sum: { totalCost: true } }),
      prisma.expense.aggregate({ _sum: { amount: true } }),
      prisma.sale.aggregate({ _sum: { total: true } }),
    ]);

    const totalCost =
      (purchases._sum.totalCost || 0) + (expenses._sum.amount || 0);
    const salesTotal = sales._sum.total || 0;
    const totalRevenue = salesTotal;
    const profit = totalRevenue - totalCost;

    return NextResponse.json({
      totalCost,
      totalRevenue,
      profit,
      purchaseTotal: purchases._sum.totalCost || 0,
      expenseTotal: expenses._sum.amount || 0,
      salesTotal,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
