import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOwner } from "@/lib/require-staff";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireOwner(request);
  if (gate.response) return gate.response;
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !["PENDING", "PAID", "DELIVERED"].includes(status)) {
      return NextResponse.json(
        { error: "Valid status required: PENDING, PAID, or DELIVERED" },
        { status: 400 }
      );
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: { items: { include: { product: true } } },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update order" },
      { status: 500 }
    );
  }
}
