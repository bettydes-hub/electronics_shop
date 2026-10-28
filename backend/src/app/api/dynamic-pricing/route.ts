import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function GET() {
  try {
    const rules = await prisma.dynamicPricingRule.findMany({
      orderBy: { updatedAt: "desc" },
      include: { product: { select: { id: true, name: true, stock: true } } },
    });
    return NextResponse.json(rules);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list rules" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const {
      productId,
      enabled,
      lowStockThreshold,
      lowStockMarkupPercent,
      highStockThreshold,
      highStockDiscountPercent,
    } = body;

    if (!productId) {
      return NextResponse.json({ error: "productId required" }, { status: 400 });
    }

    const row = await prisma.dynamicPricingRule.upsert({
      where: { productId: String(productId) },
      create: {
        productId: String(productId),
        enabled: Boolean(enabled),
        lowStockThreshold: parseInt(String(lowStockThreshold ?? 5), 10) || 5,
        lowStockMarkupPercent: parseFloat(String(lowStockMarkupPercent ?? 0)) || 0,
        highStockThreshold: parseInt(String(highStockThreshold ?? 100), 10) || 100,
        highStockDiscountPercent: parseFloat(String(highStockDiscountPercent ?? 0)) || 0,
      },
      update: {
        enabled: enabled !== undefined ? Boolean(enabled) : undefined,
        lowStockThreshold:
          lowStockThreshold !== undefined ? parseInt(String(lowStockThreshold), 10) : undefined,
        lowStockMarkupPercent:
          lowStockMarkupPercent !== undefined
            ? parseFloat(String(lowStockMarkupPercent))
            : undefined,
        highStockThreshold:
          highStockThreshold !== undefined ? parseInt(String(highStockThreshold), 10) : undefined,
        highStockDiscountPercent:
          highStockDiscountPercent !== undefined
            ? parseFloat(String(highStockDiscountPercent))
            : undefined,
      },
      include: { product: { select: { id: true, name: true, stock: true } } },
    });
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
