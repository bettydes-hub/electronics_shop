import { NextRequest, NextResponse } from "next/server";
import { getProductImageLimits, productImageCountError } from "@/lib/product-image-limits";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(products);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, price, costPrice, category, imageUrl, imageUrls, stock } = body;

    if (!name || price === undefined) {
      return NextResponse.json(
        { error: "Name and price are required" },
        { status: 400 }
      );
    }

    const urls = Array.isArray(imageUrls) && imageUrls.length > 0
      ? imageUrls.filter((u: string) => typeof u === "string" && u.trim())
      : imageUrl ? [imageUrl] : [];
    const limits = await getProductImageLimits();
    const imgErr = productImageCountError(urls.length, limits);
    if (imgErr) {
      return NextResponse.json({ error: imgErr }, { status: 400 });
    }

    const priceNum = parseFloat(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return NextResponse.json(
        { error: "Price must be a valid positive number" },
        { status: 400 }
      );
    }

    const stockNum = stock != null ? parseInt(String(stock), 10) : 0;
    if (Number.isNaN(stockNum) || stockNum < 0) {
      return NextResponse.json(
        { error: "Stock must be a valid number >= 0" },
        { status: 400 }
      );
    }

    const categoryStr = category ? String(category).trim() : null;
    const categoryRecord = categoryStr
      ? await prisma.category.findUnique({ where: { name: categoryStr } })
      : null;

    const product = await prisma.product.create({
      data: {
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        price: priceNum,
        costPrice: (() => {
          if (costPrice == null || costPrice === "") return null;
          const v = parseFloat(costPrice);
          return Number.isNaN(v) ? null : v;
        })(),
        category: categoryStr,
        categoryId: categoryRecord?.id ?? null,
        imageUrl: urls[0] || null,
        imageUrls: urls,
        stock: stockNum,
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Create product error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create product", details: message },
      { status: 500 }
    );
  }
}
