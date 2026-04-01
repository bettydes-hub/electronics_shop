import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    } = body;

    if (!customerPhone || !items?.length) {
      return NextResponse.json(
        { error: "Phone and at least one item are required" },
        { status: 400 }
      );
    }

    // Validate stock for all items
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 400 }
        );
      }
      if (product.stock < (item.quantity || 0)) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}. Available: ${product.stock}` },
          { status: 400 }
        );
      }
    }

    const orderItems = items.map(
      (i: { productId: string; quantity: number; unitPrice: number }) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })
    );
    const total = orderItems.reduce(
      (sum: number, i: { quantity: number; unitPrice: number }) =>
        sum + i.quantity * i.unitPrice,
      0
    );

    // Group quantities by product for stock decrement
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
          total,
          paymentMethod: paymentMethod || null,
          status: "PENDING",
          items: { create: orderItems },
        },
        include: { items: { include: { product: true } } },
      });
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
