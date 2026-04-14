import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwnerOrSeller } from "@/lib/require-staff";
import { parseSalesPeriod, startDateForSalesPeriod } from "@/lib/sales-period";

export async function GET(request: NextRequest) {
  const gate = await requireOwnerOrSeller(request);
  if (gate.response) return gate.response;
  try {
    const period = parseSalesPeriod(request.nextUrl.searchParams.get("period"));
    const start = startDateForSalesPeriod(period);

    const sales = await prisma.sale.findMany({
      where: start ? { createdAt: { gte: start } } : undefined,
      include: { product: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(sales);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch sales" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireOwnerOrSeller(request);
  if (gate.response) return gate.response;
  try {
    const body = await request.json();
    const { productId, quantity, unitPrice: unitPriceRaw } = body;

    if (!productId || !quantity) {
      return NextResponse.json(
        { error: "Product and quantity are required" },
        { status: 400 }
      );
    }

    const qty = parseInt(quantity, 10);
    if (Number.isNaN(qty) || qty < 1) {
      return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (product.stock < qty) {
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${product.stock}` },
        { status: 400 }
      );
    }

    let unitPrice = product.price;
    if (unitPriceRaw !== undefined && unitPriceRaw !== null && unitPriceRaw !== "") {
      const parsed =
        typeof unitPriceRaw === "number" ? unitPriceRaw : parseFloat(String(unitPriceRaw));
      if (Number.isNaN(parsed) || parsed < 0) {
        return NextResponse.json(
          { error: "Sale price must be a valid number (0 or more)" },
          { status: 400 }
        );
      }
      unitPrice = parsed;
    }

    const total = qty * unitPrice;

    const [sale] = await prisma.$transaction([
      prisma.sale.create({
        data: { productId, quantity: qty, unitPrice, total },
        include: { product: true },
      }),
      prisma.product.update({
        where: { id: productId },
        data: { stock: { decrement: qty } },
      }),
    ]);

    return NextResponse.json(sale);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to record sale" },
      { status: 500 }
    );
  }
}
