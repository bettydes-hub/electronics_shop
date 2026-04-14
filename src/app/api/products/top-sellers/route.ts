import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { attachPricingToProductJson, loadActivePromotions } from "@/lib/effective-price";

export async function GET(request: NextRequest) {
  try {
    const limitRaw = request.nextUrl.searchParams.get("limit");
    const limit = limitRaw ? parseInt(limitRaw, 10) : 8;
    const take = Number.isNaN(limit) || limit <= 0 ? 8 : Math.min(limit, 24);

    const grouped = await prisma.sale.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take,
    });

    if (grouped.length === 0) {
      return NextResponse.json([]);
    }

    const productIds = grouped.map((g) => g.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        categoryRef: { select: { id: true, name: true, nameAm: true, slug: true } },
      },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const reviewStats = await prisma.review.groupBy({
      by: ["productId"],
      where: { productId: { in: productIds } },
      _avg: { rating: true },
      _count: { _all: true },
    });
    const statsByProductId = new Map(
      reviewStats.map((s) => [
        s.productId,
        { avgRating: s._avg.rating ?? null, reviewCount: s._count._all ?? 0 },
      ])
    );

    const now = new Date();
    const promotions = await loadActivePromotions(prisma, now);

    const ranked = grouped
      .map((g) => byId.get(g.productId))
      .filter((p): p is NonNullable<typeof p> => Boolean(p))
      .map((p) => {
        const priced = attachPricingToProductJson(p, promotions, now);
        const stats = statsByProductId.get(p.id);
        return {
          ...priced,
          avgRating: stats?.avgRating ?? null,
          reviewCount: stats?.reviewCount ?? 0,
        };
      });

    return NextResponse.json(ranked);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to fetch top sellers" }, { status: 500 });
  }
}

