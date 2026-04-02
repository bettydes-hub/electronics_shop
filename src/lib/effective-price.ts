import type { Product, Promotion, DynamicPricingRule, Prisma } from "@prisma/client";

export type ProductForPricing = Pick<Product, "id" | "price" | "stock" | "categoryId">;

export type EffectivePriceResult = {
  listPrice: number;
  afterDynamicPrice: number;
  effectivePrice: number;
  promotion: null | {
    id: string;
    name: string;
    percentOff: number;
    isFlashSale: boolean;
  };
  dynamicApplied: boolean;
};

function clampPercent(p: number): number {
  if (Number.isNaN(p) || p < 0) return 0;
  if (p > 100) return 100;
  return p;
}

export function applyDynamicRule(
  listPrice: number,
  stock: number,
  rule: DynamicPricingRule | null
): { price: number; applied: boolean } {
  if (!rule || !rule.enabled) return { price: listPrice, applied: false };
  let p = listPrice;
  let applied = false;
  if (stock <= rule.lowStockThreshold && rule.lowStockMarkupPercent > 0) {
    p *= 1 + clampPercent(rule.lowStockMarkupPercent) / 100;
    applied = true;
  } else if (stock >= rule.highStockThreshold && rule.highStockDiscountPercent > 0) {
    p *= 1 - clampPercent(rule.highStockDiscountPercent) / 100;
    applied = true;
  }
  return { price: Math.round(p * 100) / 100, applied };
}

function promotionMatchesProduct(
  promo: Promotion,
  product: ProductForPricing,
  now: Date
): boolean {
  if (!promo.active) return false;
  if (promo.startsAt > now || promo.endsAt < now) return false;
  if (promo.scope === "PRODUCT") return promo.productId === product.id;
  if (promo.scope === "CATEGORY") {
    return promo.categoryId != null && promo.categoryId === product.categoryId;
  }
  return false;
}

export function pickBestPromotion(
  product: ProductForPricing,
  promotions: Promotion[],
  now: Date
): Promotion | null {
  let best: Promotion | null = null;
  for (const promo of promotions) {
    if (!promotionMatchesProduct(promo, product, now)) continue;
    if (!best || promo.percentOff > best.percentOff) best = promo;
  }
  return best;
}

export function computeEffectivePrice(
  product: ProductForPricing,
  dynamicRule: DynamicPricingRule | null,
  promotions: Promotion[],
  now = new Date()
): EffectivePriceResult {
  const listPrice = product.price;
  const { price: afterDynamic, applied: dynamicApplied } = applyDynamicRule(
    listPrice,
    product.stock,
    dynamicRule
  );
  const promo = pickBestPromotion(product, promotions, now);
  const pct = promo ? clampPercent(promo.percentOff) : 0;
  const effectivePrice =
    pct > 0
      ? Math.round(afterDynamic * (1 - pct / 100) * 100) / 100
      : afterDynamic;

  return {
    listPrice,
    afterDynamicPrice: afterDynamic,
    effectivePrice,
    promotion: promo
      ? {
          id: promo.id,
          name: promo.name,
          percentOff: promo.percentOff,
          isFlashSale: promo.isFlashSale,
        }
      : null,
    dynamicApplied,
  };
}

export type CouponRow = {
  id: string;
  code: string;
  percentOff: number | null;
  fixedOff: number | null;
  maxUses: number | null;
  usedCount: number;
  minOrderTotal: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  active: boolean;
};

export function validateCouponForSubtotal(
  coupon: CouponRow | null,
  subtotal: number,
  now = new Date()
): { ok: true; discount: number } | { ok: false; error: string } {
  if (!coupon) return { ok: false, error: "Invalid coupon" };
  if (!coupon.active) return { ok: false, error: "Coupon is not active" };
  const code = coupon.code?.trim().toUpperCase();
  if (!code) return { ok: false, error: "Invalid coupon" };
  if (coupon.startsAt && now < coupon.startsAt) return { ok: false, error: "Coupon not valid yet" };
  if (coupon.endsAt && now > coupon.endsAt) return { ok: false, error: "Coupon has expired" };
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) {
    return { ok: false, error: "Coupon usage limit reached" };
  }
  const minTot = coupon.minOrderTotal ?? 0;
  if (subtotal < minTot) {
    return { ok: false, error: `Minimum order ${minTot.toFixed(2)} required` };
  }
  const pct = coupon.percentOff != null ? clampPercent(coupon.percentOff) : 0;
  const fixed = coupon.fixedOff != null ? Math.max(0, coupon.fixedOff) : 0;
  if (pct <= 0 && fixed <= 0) return { ok: false, error: "Coupon has no discount" };
  let discount = 0;
  if (pct > 0) discount += (subtotal * pct) / 100;
  if (fixed > 0) discount += fixed;
  discount = Math.min(subtotal, Math.round(discount * 100) / 100);
  return { ok: true, discount };
}

export async function loadActivePromotions(
  prisma: {
    promotion: {
      findMany: (args: {
        where: Prisma.PromotionWhereInput;
      }) => Promise<Promotion[]>;
    };
  },
  now = new Date()
): Promise<Promotion[]> {
  return prisma.promotion.findMany({
    where: {
      active: true,
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
  });
}

export function attachPricingToProductJson(
  product: ProductForPricing & { dynamicPricing?: DynamicPricingRule | null },
  promotions: Promotion[],
  now = new Date()
) {
  const { dynamicPricing: _d, ...rest } = product as ProductForPricing & {
    dynamicPricing?: DynamicPricingRule | null;
  };
  const dyn = product.dynamicPricing ?? null;
  const { listPrice, afterDynamicPrice, effectivePrice, promotion, dynamicApplied } =
    computeEffectivePrice(product, dyn, promotions, now);
  return {
    ...rest,
    listPrice,
    afterDynamicPrice,
    effectivePrice,
    promotionLabel: promotion?.name ?? null,
    promotionPercentOff: promotion?.percentOff ?? null,
    isFlashSale: promotion?.isFlashSale ?? false,
    dynamicPricingApplied: dynamicApplied,
  };
}
