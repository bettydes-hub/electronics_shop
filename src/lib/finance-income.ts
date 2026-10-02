import { prisma } from "@/lib/prisma";

/** Sum catalog sales + other (manual) income for a date-only range (UTC dates). */
export async function sumIncomeInRange(from: Date, to: Date) {
  const [sales, other] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { total: true },
      where: { date: { gte: from, lte: to } },
    }),
    prisma.dailyIncome.aggregate({
      _sum: { amount: true },
      where: { date: { gte: from, lte: to } },
    }),
  ]);
  const salesTotal = sales._sum.total || 0;
  const otherIncomeTotal = other._sum.amount || 0;
  return {
    salesTotal,
    otherIncomeTotal,
    incomeTotal: salesTotal + otherIncomeTotal,
  };
}

export async function sumAllIncome() {
  const [sales, other] = await Promise.all([
    prisma.sale.aggregate({ _sum: { total: true } }),
    prisma.dailyIncome.aggregate({ _sum: { amount: true } }),
  ]);
  const salesTotal = sales._sum.total || 0;
  const otherIncomeTotal = other._sum.amount || 0;
  return {
    salesTotal,
    otherIncomeTotal,
    incomeTotal: salesTotal + otherIncomeTotal,
  };
}
