import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    const reviews = await prisma.review.findMany({
      where: { productId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, authorName: true, rating: true, comment: true, createdAt: true },
    });
    return NextResponse.json(reviews);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch reviews" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = await request.json();
    const { authorName, rating, comment } = body;

    const r = parseInt(String(rating), 10);
    if (Number.isNaN(r) || r < 1 || r > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 });
    }

    const name =
      typeof authorName === "string" && authorName.trim()
        ? authorName.trim().slice(0, 80)
        : "Customer";

    const review = await prisma.review.create({
      data: {
        productId: id,
        authorName: name,
        rating: r,
        comment:
          typeof comment === "string" && comment.trim() ? comment.trim().slice(0, 2000) : null,
      },
      select: { id: true, authorName: true, rating: true, comment: true, createdAt: true },
    });

    return NextResponse.json(review);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to create review" }, { status: 500 });
  }
}
