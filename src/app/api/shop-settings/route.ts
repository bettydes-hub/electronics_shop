import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_PRODUCT_IMAGE_MAX,
  DEFAULT_PRODUCT_IMAGE_MIN,
  normalizeImageLimits,
} from "@/lib/product-image-policy";
import { prisma } from "@/lib/prisma";
import { getShopContact } from "@/lib/shop-contact";
import { SHOP_SETTINGS_ROW_ID } from "@/lib/shop-settings-constants";
import { requireAdmin } from "@/lib/require-admin";

function shapeFromRow(row: {
  storeName: string;
  address: string;
  phone: string;
  tiktokUrl: string;
  instagramUrl: string;
  telegramUrl: string;
}) {
  const fallback = getShopContact();
  return {
    storeName: row.storeName.trim() || fallback.storeName,
    address: row.address.replace(/\\n/g, "\n"),
    phone: row.phone.trim(),
    tiktokUrl: row.tiktokUrl.trim(),
    instagramUrl: row.instagramUrl.trim(),
    telegramUrl: row.telegramUrl.trim(),
  };
}

function withImageLimits<T extends Record<string, unknown>>(
  base: T,
  row: { productImageCountMin: number; productImageCountMax: number } | null
) {
  const limits = row
    ? normalizeImageLimits(row.productImageCountMin, row.productImageCountMax)
    : { min: DEFAULT_PRODUCT_IMAGE_MIN, max: DEFAULT_PRODUCT_IMAGE_MAX };
  return {
    ...base,
    productImageCountMin: limits.min,
    productImageCountMax: limits.max,
  };
}

export async function GET() {
  try {
    const row = await prisma.shopSettings.findUnique({
      where: { id: SHOP_SETTINGS_ROW_ID },
    });
    if (!row) {
      return NextResponse.json(withImageLimits(getShopContact(), null));
    }
    return NextResponse.json(withImageLimits(shapeFromRow(row), row));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load shop settings" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const gate = await requireAdmin(request);
  if (gate.response) return gate.response;

  try {
    const body = await request.json();
    const storeName = typeof body.storeName === "string" ? body.storeName.trim() : "";
    if (!storeName) {
      return NextResponse.json({ error: "Store name is required" }, { status: 400 });
    }

    const address = typeof body.address === "string" ? body.address : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const tiktokUrl = typeof body.tiktokUrl === "string" ? body.tiktokUrl.trim() : "";
    const instagramUrl = typeof body.instagramUrl === "string" ? body.instagramUrl.trim() : "";
    const telegramUrl = typeof body.telegramUrl === "string" ? body.telegramUrl.trim() : "";

    const parseLimit = (v: unknown): number | undefined => {
      if (v === undefined || v === null || v === "") return undefined;
      const n = typeof v === "number" ? v : parseInt(String(v), 10);
      return Number.isFinite(n) ? n : undefined;
    };

    const existing = await prisma.shopSettings.findUnique({
      where: { id: SHOP_SETTINGS_ROW_ID },
    });
    const incomingMin = parseLimit(body.productImageCountMin);
    const incomingMax = parseLimit(body.productImageCountMax);
    const baseMin = existing?.productImageCountMin ?? DEFAULT_PRODUCT_IMAGE_MIN;
    const baseMax = existing?.productImageCountMax ?? DEFAULT_PRODUCT_IMAGE_MAX;
    const { min: productImageCountMin, max: productImageCountMax } = normalizeImageLimits(
      incomingMin ?? baseMin,
      incomingMax ?? baseMax
    );

    const row = await prisma.shopSettings.upsert({
      where: { id: SHOP_SETTINGS_ROW_ID },
      create: {
        id: SHOP_SETTINGS_ROW_ID,
        storeName,
        address,
        phone,
        tiktokUrl,
        instagramUrl,
        telegramUrl,
        productImageCountMin,
        productImageCountMax,
      },
      update: {
        storeName,
        address,
        phone,
        tiktokUrl,
        instagramUrl,
        telegramUrl,
        productImageCountMin,
        productImageCountMax,
      },
    });

    return NextResponse.json(withImageLimits(shapeFromRow(row), row));
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to save shop settings" }, { status: 500 });
  }
}
