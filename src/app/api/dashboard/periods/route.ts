import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = x.getDate() - day + (day === 0 ? -6 : 1);
  x.setDate(diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfWeek(d: Date): Date {
  const s = startOfWeek(d);
  const e = new Date(s);
  e.setDate(s.getDate() + 6);
  e.setHours(23, 59, 59, 999);
  return e;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}

/** First day of the month, `monthOffset` months from `d`'s month (0 = same month). */
function startOfMonthWithOffset(d: Date, monthOffset: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + monthOffset, 1, 0, 0, 0, 0);
}

function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1, 0, 0, 0, 0);
}

function endOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999);
}

async function summarizeRange(start: Date, end: Date) {
  const whereDate = { gte: start, lte: end };
  const [purchases, expenses, sales] = await Promise.all([
    prisma.purchase.aggregate({
      _sum: { totalCost: true },
      where: { createdAt: whereDate },
    }),
    prisma.expense.aggregate({
      _sum: { amount: true },
      where: { createdAt: whereDate },
    }),
    prisma.sale.aggregate({
      _sum: { total: true },
      where: { createdAt: whereDate },
    }),
  ]);

  const purchaseTotal = purchases._sum.totalCost || 0;
  const expenseTotal = expenses._sum.amount || 0;
  const salesTotal = sales._sum.total || 0;
  const totalCost = purchaseTotal + expenseTotal;
  const totalRevenue = salesTotal;
  const profit = totalRevenue - totalCost;

  return {
    purchaseTotal,
    expenseTotal,
    salesTotal,
    totalCost,
    totalRevenue,
    profit,
  };
}

export async function GET() {
  try {
    const now = new Date();

    const wStart = startOfWeek(now);
    const wEnd = endOfWeek(now);
    const mStart = startOfMonth(now);
    const mEnd = endOfMonth(now);
    const threeStart = startOfMonthWithOffset(now, -2);
    const sixStart = startOfMonthWithOffset(now, -5);
    const yStart = startOfYear(now);
    const yEnd = endOfYear(now);

    const [week, month, threeMonths, sixMonths, year] = await Promise.all([
      summarizeRange(wStart, wEnd),
      summarizeRange(mStart, mEnd),
      summarizeRange(threeStart, mEnd),
      summarizeRange(sixStart, mEnd),
      summarizeRange(yStart, yEnd),
    ]);

    const fmt = (d: Date) =>
      d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

    const shortMonthYear = (d: Date) =>
      d.toLocaleDateString(undefined, { month: "short", year: "numeric" });

    return NextResponse.json({
      week: {
        ...week,
        label: `${fmt(wStart)} – ${fmt(wEnd)}`,
      },
      month: {
        ...month,
        label: now.toLocaleDateString(undefined, { month: "long", year: "numeric" }),
      },
      threeMonths: {
        ...threeMonths,
        label: `${shortMonthYear(threeStart)} – ${shortMonthYear(mEnd)}`,
      },
      sixMonths: {
        ...sixMonths,
        label: `${shortMonthYear(sixStart)} – ${shortMonthYear(mEnd)}`,
      },
      year: {
        ...year,
        label: String(now.getFullYear()),
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch period dashboard" },
      { status: 500 }
    );
  }
}
