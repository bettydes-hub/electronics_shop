import { NextRequest, NextResponse } from "next/server";
import { priceOrderLines } from "@/lib/order-pricing";

/** Public: preview totals with server-side pricing (no stock mutation). */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { items } = body;
    if (!items?.length) {
      return NextResponse.json({ error: "No items" }, { status: 400 });
    }
    const merged = new Map<string, number>();
    for (const item of items as { productId: string; quantity: number }[]) {
      const pid = String(item.productId || "").trim();
      const q = Math.floor(Number(item.quantity) || 0);
      if (!pid || q <= 0) {
        return NextResponse.json({ error: "Invalid cart line" }, { status: 400 });
      }
      merged.set(pid, (merged.get(pid) || 0) + q);
    }
    const lineInputs = Array.from(merged.entries()).map(([productId, quantity]) => ({
      productId,
      quantity,
    }));

    const priced = await priceOrderLines(lineInputs);
    if (!priced.ok) {
      return NextResponse.json({ error: priced.error }, { status: 400 });
    }

    const discountTotal = 0;
    const total = Math.round((priced.subtotal - discountTotal) * 100) / 100;

    return NextResponse.json({
      subtotal: priced.subtotal,
      discountTotal,
      total,
      lines: priced.pricedLines,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Quote failed" }, { status: 500 });
  }
}
