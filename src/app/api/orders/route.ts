import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { applyCouponToSubtotal, priceOrderLines } from "@/lib/order-pricing";

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customerPhone,
      customerName,
      deliveryAddress,
      paymentMethod,
      items,
      couponCode,
    } = body;

    if (!customerPhone || !items?.length) {
      return NextResponse.json(
        { error: "Phone and at least one item are required" },
        { status: 400 }
      );
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
    const lineInputs = [...merged.entries()].map(([productId, quantity]) => ({
      productId,
      quantity,
    }));

    const priced = await priceOrderLines(lineInputs);
    if (!priced.ok) {
      return NextResponse.json({ error: priced.error }, { status: 400 });
    }

    for (const line of priced.pricedLines) {
      const product = await prisma.product.findUnique({ where: { id: line.productId } });
      if (!product) {
        return NextResponse.json({ error: `Product ${line.productId} not found` }, { status: 400 });
      }
      if (product.stock < line.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}. Available: ${product.stock}` },
          { status: 400 }
        );
      }
    }

    const couponResult = await applyCouponToSubtotal(priced.subtotal, couponCode);
    if (!couponResult.ok) {
      return NextResponse.json({ error: couponResult.error }, { status: 400 });
    }

    const discountTotal = couponResult.discount;
    const total = Math.round((priced.subtotal - discountTotal) * 100) / 100;
    if (total < 0) {
      return NextResponse.json({ error: "Invalid total" }, { status: 400 });
    }

    const orderItems = priced.pricedLines.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
    }));

    const stockUpdates = orderItems.reduce(
      (acc: Record<string, number>, i: { productId: string; quantity: number }) => {
        acc[i.productId] = (acc[i.productId] || 0) + i.quantity;
        return acc;
      },
      {}
    );

    const order = await prisma.$transaction(async (tx) => {
      const o = await tx.order.create({
        data: {
          customerPhone,
          customerName: customerName || null,
          deliveryAddress: deliveryAddress || null,
          subtotal: priced.subtotal,
          discountTotal,
          total,
          couponId: couponResult.coupon?.id ?? null,
          couponCodeSnapshot: couponResult.codeSnapshot,
          paymentMethod: paymentMethod || null,
          status: "PENDING",
          items: { create: orderItems },
        },
        include: { items: { include: { product: true } } },
      });
      if (couponResult.coupon && discountTotal > 0) {
        await tx.coupon.update({
          where: { id: couponResult.coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }
      for (const productId of Object.keys(stockUpdates)) {
        const qty = stockUpdates[productId];
        await tx.product.update({
          where: { id: productId },
          data: { stock: { decrement: qty } },
        });
      }
      return o;
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
