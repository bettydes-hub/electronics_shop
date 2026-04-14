import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function GET() {
  try {
    // Backfill: link products that have category name but no categoryId
    const orphans = await prisma.product.findMany({
      where: { category: { not: null }, categoryId: null },
      select: { id: true, category: true },
    });
    for (const p of orphans) {
      if (p.category) {
        const cat = await prisma.category.findUnique({ where: { name: p.category } });
        if (cat) {
          await prisma.product.update({ where: { id: p.id }, data: { categoryId: cat.id } });
        }
      }
    }

    const categories = await prisma.category.findMany({
      include: {
        _count: { select: { products: true } },
        products: {
          select: { imageUrl: true, imageUrls: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { name: "asc" },
    });
    const categoriesWithPreview = categories.map((c) => {
      const first = c.products[0];
      const previewImageUrl =
        first?.imageUrls && first.imageUrls.length > 0
          ? first.imageUrls[0]
          : first?.imageUrl ?? null;
      return {
        ...c,
        previewImageUrl,
      };
    });
    return NextResponse.json(categoriesWithPreview);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;

  try {
    const body = await request.json();
    const { name, nameAm, slug } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.category.findUnique({
      where: { name: name.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Category already exists" },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        nameAm: nameAm != null && String(nameAm).trim() ? String(nameAm).trim() : null,
        slug: slug || name.trim().toLowerCase().replace(/\s+/g, "-"),
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
