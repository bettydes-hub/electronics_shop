import { NextRequest, NextResponse } from "next/server";
import { getProductImageLimits, productImageCountError } from "@/lib/product-image-limits";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";
import { attachPricingToProductJson, loadActivePromotions } from "@/lib/effective-price";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        categoryRef: { select: { id: true, name: true, nameAm: true, slug: true } },
      },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    const promotions = await loadActivePromotions(prisma, new Date());
    return NextResponse.json(attachPricingToProductJson(product, promotions, new Date()));
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, nameAm, descriptionAm, price, costPrice, category, imageUrl, imageUrls, stock } =
      body;

    let resolvedCategoryId: string | null | "skip" = "skip";
    if (category !== undefined) {
      const categoryStr = category ? String(category).trim() : null;
      resolvedCategoryId = categoryStr
        ? (await prisma.category.findUnique({ where: { name: categoryStr } }))?.id ?? null
        : null;
    }

    let updateData: Record<string, unknown> = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(nameAm !== undefined && {
        nameAm: nameAm != null && String(nameAm).trim() ? String(nameAm).trim() : null,
      }),
      ...(descriptionAm !== undefined && {
        descriptionAm:
          descriptionAm != null && String(descriptionAm).trim() ? String(descriptionAm).trim() : null,
      }),
      ...(price !== undefined && { price: parseFloat(price) }),
      ...(costPrice !== undefined && { costPrice: costPrice != null ? parseFloat(costPrice) : null }),
      ...(category !== undefined && { category }),
      ...(resolvedCategoryId !== "skip" && { categoryId: resolvedCategoryId }),
      ...(stock !== undefined && { stock: parseInt(stock, 10) }),
    };

    if (imageUrls !== undefined) {
      const urls = Array.isArray(imageUrls)
        ? imageUrls.filter((u: string) => typeof u === "string" && u.trim())
        : [];
      const limits = await getProductImageLimits();
      const imgErr = productImageCountError(urls.length, limits);
      if (imgErr) {
        return NextResponse.json({ error: imgErr }, { status: 400 });
      }
      updateData.imageUrls = urls;
      updateData.imageUrl = urls[0] || null;
    } else if (imageUrl !== undefined) {
      if (imageUrl) {
        const limits = await getProductImageLimits();
        const imgErr = productImageCountError(1, limits);
        if (imgErr) {
          return NextResponse.json({ error: imgErr }, { status: 400 });
        }
        updateData.imageUrl = imageUrl;
        updateData.imageUrls = [imageUrl];
      } else {
        updateData.imageUrl = imageUrl;
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
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
    await prisma.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
