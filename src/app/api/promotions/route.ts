import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;
  try {
    const list = await prisma.promotion.findMany({
      orderBy: { endsAt: "desc" },
      include: { product: { select: { id: true, name: true } }, categoryRef: { select: { id: true, name: true } } },
    });
    return NextResponse.json(list);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to list promotions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const {
      name,
      nameAm,
      scope,
      productId,
      categoryId,
      percentOff,
      startsAt,
      endsAt,
      isFlashSale,
      active,
    } = body;

    if (!name || !scope || percentOff == null || !startsAt || !endsAt) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (scope !== "PRODUCT" && scope !== "CATEGORY") {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }
    if (scope === "PRODUCT" && !productId) {
      return NextResponse.json({ error: "productId required for PRODUCT scope" }, { status: 400 });
    }
    if (scope === "CATEGORY" && !categoryId) {
      return NextResponse.json({ error: "categoryId required for CATEGORY scope" }, { status: 400 });
    }

    const pct = parseFloat(String(percentOff));
    if (Number.isNaN(pct) || pct <= 0 || pct > 100) {
      return NextResponse.json({ error: "percentOff must be 1–100" }, { status: 400 });
    }

    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }

    const row = await prisma.promotion.create({
      data: {
        name: String(name).trim(),
        nameAm: nameAm != null && String(nameAm).trim() ? String(nameAm).trim() : null,
        scope,
        productId: scope === "PRODUCT" ? String(productId) : null,
        categoryId: scope === "CATEGORY" ? String(categoryId) : null,
        percentOff: pct,
        startsAt: start,
        endsAt: end,
        isFlashSale: Boolean(isFlashSale),
        active: active !== false,
      },
      include: { product: { select: { id: true, name: true } }, categoryRef: { select: { id: true, name: true } } },
    });
    return NextResponse.json(row);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create promotion" }, { status: 500 });
  }
}
