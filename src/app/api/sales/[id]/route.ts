import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-staff";
import { parseDateOnly } from "@/lib/finance-dates";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
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

    const date =
      body.date !== undefined
        ? parseDateOnly(body.date)
        : existing.date;
    if (body.date !== undefined && !date) {
      return NextResponse.json({ error: "Invalid date (YYYY-MM-DD)" }, { status: 400 });
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
          ...(date ? { date } : {}),
        },
      });
    });

    const updated = await prisma.sale.findUnique({
      where: { id },
      include: {
        product: { select: { id: true, name: true, nameAm: true, stock: true, price: true } },
      },
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  try {
    const { id } = await params;
    const existing = await prisma.sale.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    await prisma.$transaction([
      prisma.product.update({
        where: { id: existing.productId },
        data: { stock: { increment: existing.quantity } },
      }),
      prisma.sale.delete({ where: { id } }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to delete sale" }, { status: 500 });
  }
}
