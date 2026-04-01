import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Restore stock for the old line, then apply the updated line (product / qty / price). */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.sale.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const productId =
      typeof body.productId === "string" && body.productId.trim()
        ? body.productId.trim()
        : existing.productId;

    const quantity =
      body.quantity !== undefined && body.quantity !== null && body.quantity !== ""
        ? parseInt(String(body.quantity), 10)
        : existing.quantity;

    if (Number.isNaN(quantity) || quantity < 1) {
      return NextResponse.json({ error: "Quantity must be at least 1" }, { status: 400 });
    }

    let unitPrice = existing.unitPrice;
    if (body.unitPrice !== undefined && body.unitPrice !== null && body.unitPrice !== "") {
      const parsed =
        typeof body.unitPrice === "number" ? body.unitPrice : parseFloat(String(body.unitPrice));
      if (Number.isNaN(parsed) || parsed < 0) {
        return NextResponse.json(
          { error: "Sale price must be a valid number (0 or more)" },
          { status: 400 }
        );
      }
      unitPrice = parsed;
    }

    await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: existing.productId },
        data: { stock: { increment: existing.quantity } },
      });

      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new Error("PRODUCT_NOT_FOUND");
      }
      if (product.stock < quantity) {
        throw new Error(`INSUFFICIENT_STOCK:${product.stock}`);
      }

      await tx.product.update({
        where: { id: productId },
        data: { stock: { decrement: quantity } },
      });

      await tx.sale.update({
        where: { id },
        data: {
          productId,
          quantity,
          unitPrice,
          total: quantity * unitPrice,
        },
      });
    });

    const updated = await prisma.sale.findUnique({
      where: { id },
      include: { product: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "PRODUCT_NOT_FOUND") {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (msg.startsWith("INSUFFICIENT_STOCK:")) {
      const n = msg.split(":")[1];
      return NextResponse.json(
        { error: `Insufficient stock. Available: ${n}` },
        { status: 400 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to update sale" }, { status: 500 });
  }
}
