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
  storeNameAm: string | null;
  address: string;
  addressAm: string | null;
  phone: string;
  tiktokUrl: string;
  instagramUrl: string;
  telegramUrl: string;
}) {
  const fallback = getShopContact();
  return {
    storeName: row.storeName.trim() || fallback.storeName,
    storeNameAm: (row.storeNameAm ?? "").trim(),
    address: row.address.replace(/\\n/g, "\n"),
    addressAm: (row.addressAm ?? "").replace(/\\n/g, "\n"),
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
      return NextResponse.json({ error: "Store name (English) is required" }, { status: 400 });
    }
    const storeNameAm =
      typeof body.storeNameAm === "string" ? body.storeNameAm.trim() || null : null;
    if (!storeNameAm) {
      return NextResponse.json({ error: "Store name (Amharic) is required" }, { status: 400 });
    }

    const address = typeof body.address === "string" ? body.address : "";
    const addressAm = typeof body.addressAm === "string" ? body.addressAm.trim() || null : null;
    if (!address.trim()) {
      return NextResponse.json({ error: "Address (English) is required" }, { status: 400 });
    }
    if (!addressAm) {
      return NextResponse.json({ error: "Address (Amharic) is required" }, { status: 400 });
    }

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
        storeNameAm,
        address,
        addressAm,
        phone,
        tiktokUrl,
        instagramUrl,
        telegramUrl,
        productImageCountMin,
        productImageCountMax,
      },
      update: {
        storeName,
        storeNameAm,
        address,
        addressAm,
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
