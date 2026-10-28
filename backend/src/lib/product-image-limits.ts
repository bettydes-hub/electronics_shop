import { prisma } from "@/lib/prisma";
import { SHOP_SETTINGS_ROW_ID } from "@/lib/shop-settings-constants";
import {
  DEFAULT_PRODUCT_IMAGE_MAX,
  DEFAULT_PRODUCT_IMAGE_MIN,
  normalizeImageLimits,
} from "@/lib/product-image-policy";

export {
  DEFAULT_PRODUCT_IMAGE_MAX,
  DEFAULT_PRODUCT_IMAGE_MIN,
  PRODUCT_IMAGE_HARD_MAX,
  PRODUCT_IMAGE_HARD_MIN,
  normalizeImageLimits,
  productImageCountError,
} from "@/lib/product-image-policy";

export async function getProductImageLimits(): Promise<{ min: number; max: number }> {
  const row = await prisma.shopSettings.findUnique({
    where: { id: SHOP_SETTINGS_ROW_ID },
    select: { productImageCountMin: true, productImageCountMax: true },
  });
  if (!row) {
    return { min: DEFAULT_PRODUCT_IMAGE_MIN, max: DEFAULT_PRODUCT_IMAGE_MAX };
  }
  return normalizeImageLimits(row.productImageCountMin, row.productImageCountMax);
}
