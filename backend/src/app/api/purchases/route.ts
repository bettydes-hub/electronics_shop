import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/require-staff";

export async function GET(request: NextRequest) {
  const gate = await requireOwner(request);
  if (gate.response) return gate.response;
  try {
    const purchases = await prisma.purchase.findMany({
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(purchases);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch purchases" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireOwner(request);
  if (gate.response) return gate.response;
  try {
    const body = await request.json();
    const { productId, quantity, unitCost, unitSalePrice, notes } = body;

    if (!productId || !quantity || unitCost === undefined) {
      return NextResponse.json(
        { error: "productId, quantity, and unitCost are required" },
        { status: 400 }
      );
    }

    const qty = parseInt(String(quantity), 10);
    const cost = parseFloat(String(unitCost));

    if (Number.isNaN(qty) || qty <= 0) {
      return NextResponse.json(
        { error: "quantity must be a positive number" },
        { status: 400 }
      );
    }
    if (Number.isNaN(cost) || cost < 0) {
      return NextResponse.json(
        { error: "unitCost must be a valid number >= 0" },
        { status: 400 }
      );
    }

    let sale: number | null = null;
    if (unitSalePrice !== undefined && unitSalePrice !== null && unitSalePrice !== "") {
      const p = parseFloat(String(unitSalePrice));
      if (Number.isNaN(p) || p < 0) {
        return NextResponse.json(
          { error: "unitSalePrice must be a valid number >= 0" },
          { status: 400 }
        );
      }
      sale = p;
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json(
        { error: "Product not found. Make sure productId is valid (from GET /api/products)" },
        { status: 404 }
      );
    }

    const totalCost = qty * cost;

    const productUpdate: { stock: { increment: number }; price?: number; costPrice?: number } = {
      stock: { increment: qty },
      costPrice: cost,
    };
    if (sale !== null) {
      productUpdate.price = sale;
    }

    const [purchase] = await prisma.$transaction([
      prisma.purchase.create({
        data: {
          productId,
          quantity: qty,
          unitCost: cost,
          unitSalePrice: sale,
          totalCost,
          notes: notes || null,
        },
        include: { product: true },
      }),
      prisma.product.update({
        where: { id: productId },
        data: productUpdate,
      }),
    ]);

    return NextResponse.json(purchase);
  } catch (error) {
    console.error("Purchase error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to record purchase", details: message },
      { status: 500 }
    );
  }
}
