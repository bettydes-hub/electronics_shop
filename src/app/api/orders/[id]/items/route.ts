import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/require-staff";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireOwner(request);
  if (gate.response) return gate.response;
  try {
    const { id: orderId } = await params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    return NextResponse.json(order.items);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch order items" },
      { status: 500 }
    );
  }
}
