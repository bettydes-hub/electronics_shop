import type { Coupon, Product } from "@prisma/client";
import {
  computeEffectivePrice,
  loadActivePromotions,
  validateCouponForSubtotal,
  type CouponRow,
} from "@/lib/effective-price";
import { prisma } from "@/lib/prisma";

export type OrderLineInput = { productId: string; quantity: number };

export type PricedOrderLine = {
  productId: string;
  quantity: number;
  unitPrice: number;
  listPrice: number;
};

export async function priceOrderLines(
  lines: OrderLineInput[],
  now = new Date()
): Promise<
  | { ok: true; pricedLines: PricedOrderLine[]; subtotal: number }
  | { ok: false; error: string }
> {
  if (!lines.length) return { ok: false, error: "No items" };
  const ids = [...new Set(lines.map((l) => l.productId))];
  const products = await prisma.product.findMany({
    where: { id: { in: ids } },
    include: { dynamicPricing: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));
  const promotions = await loadActivePromotions(prisma, now);

  const pricedLines: PricedOrderLine[] = [];
  for (const line of lines) {
    const qty = Math.max(0, Math.floor(line.quantity));
    if (qty <= 0) return { ok: false, error: "Invalid quantity" };
    const p = byId.get(line.productId);
    if (!p) return { ok: false, error: `Product not found: ${line.productId}` };
    const { effectivePrice, listPrice } = computeEffectivePrice(
      p,
      p.dynamicPricing,
      promotions,
      now
    );
    pricedLines.push({
      productId: p.id,
      quantity: qty,
      unitPrice: effectivePrice,
      listPrice,
    });
  }

  const subtotal = pricedLines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  return { ok: true, pricedLines, subtotal: Math.round(subtotal * 100) / 100 };
}

export async function applyCouponToSubtotal(
  subtotal: number,
  couponCode: string | null | undefined,
  now = new Date()
): Promise<
  | { ok: true; discount: number; coupon: Coupon | null; codeSnapshot: string | null }
  | { ok: false; error: string }
> {
  const raw = couponCode?.trim();
  if (!raw) {
    return { ok: true, discount: 0, coupon: null, codeSnapshot: null };
  }
  const norm = raw.toUpperCase();
  const coupon = await prisma.coupon.findUnique({ where: { code: norm } });
  const row: CouponRow | null = coupon
    ? {
        id: coupon.id,
        code: coupon.code,
        percentOff: coupon.percentOff,
        fixedOff: coupon.fixedOff,
        maxUses: coupon.maxUses,
        usedCount: coupon.usedCount,
        minOrderTotal: coupon.minOrderTotal,
        startsAt: coupon.startsAt,
        endsAt: coupon.endsAt,
        active: coupon.active,
      }
    : null;
  const v = validateCouponForSubtotal(row, subtotal, now);
  if (!v.ok) return v;
  return {
    ok: true,
    discount: v.discount,
    coupon: coupon && v.discount > 0 ? coupon : null,
    codeSnapshot: norm,
  };
}
