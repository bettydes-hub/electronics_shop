import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getProductImageLimits, productImageCountError } from "@/lib/product-image-limits";
import { prisma } from "@/lib/prisma";
import { categoryPathSlug, slugifyName } from "@/lib/slug";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categorySlug = searchParams.get("categorySlug")?.trim();
    const q = searchParams.get("q")?.trim();
    const minPriceRaw = searchParams.get("minPrice");
    const maxPriceRaw = searchParams.get("maxPrice");
    const sort = searchParams.get("sort")?.trim() || "newest";
    const limitRaw = searchParams.get("limit");
    const featured = searchParams.get("featured") === "1";

    const where: Prisma.ProductWhereInput = {};
    const and: Prisma.ProductWhereInput[] = [];

    if (featured) {
      and.push({ stock: { gt: 0 } });
    }

    if (categorySlug) {
      const norm = categorySlug.toLowerCase();
      const categories = await prisma.category.findMany();
      const cat = categories.find(
        (c) => categoryPathSlug(c.name, c.slug).toLowerCase() === norm || slugifyName(c.name) === norm
      );
      if (!cat) {
        return NextResponse.json([]);
      }
      and.push({
        OR: [
          { categoryId: cat.id },
          { AND: [{ categoryId: null }, { category: cat.name }] },
        ],
      });
    }

    if (q) {
      and.push({
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { description: { contains: q, mode: "insensitive" } },
          { category: { contains: q, mode: "insensitive" } },
        ],
      });
    }

    const priceFilter: Prisma.FloatFilter = {};
    if (minPriceRaw != null && minPriceRaw !== "") {
      const n = parseFloat(minPriceRaw);
      if (!Number.isNaN(n)) priceFilter.gte = n;
    }
    if (maxPriceRaw != null && maxPriceRaw !== "") {
      const n = parseFloat(maxPriceRaw);
      if (!Number.isNaN(n)) priceFilter.lte = n;
    }
    if (Object.keys(priceFilter).length > 0) {
      and.push({ price: priceFilter });
    }

    if (and.length > 0) {
      where.AND = and;
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === "price-asc"
        ? { price: "asc" }
        : sort === "price-desc"
          ? { price: "desc" }
          : { createdAt: "desc" };

    const limit = limitRaw != null && limitRaw !== "" ? parseInt(limitRaw, 10) : undefined;
    const take = limit != null && !Number.isNaN(limit) && limit > 0 ? limit : undefined;

    const products = await prisma.product.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy,
      take,
    });

    const productIds = products.map((p) => p.id);
    const reviewStats =
      productIds.length > 0
        ? await prisma.review.groupBy({
            by: ["productId"],
            where: { productId: { in: productIds } },
            _avg: { rating: true },
            _count: { _all: true },
          })
        : [];

    const statsByProductId = new Map(
      reviewStats.map((s) => [
        s.productId,
        { avgRating: s._avg.rating ?? null, reviewCount: s._count._all ?? 0 },
      ])
    );

    const enrichedProducts = products.map((p) => {
      const stats = statsByProductId.get(p.id);
      return {
        ...p,
        avgRating: stats?.avgRating ?? null,
        reviewCount: stats?.reviewCount ?? 0,
      };
    });

    return NextResponse.json(enrichedProducts);
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
