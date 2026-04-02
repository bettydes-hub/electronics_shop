import type { ShopLocale } from "@/lib/shop-messages";

export type ProductTextFields = {
  name: string;
  nameAm?: string | null;
  description?: string | null;
  descriptionAm?: string | null;
};

/** One product, two languages — missing side falls back to the other. */
export function productDisplayName(p: ProductTextFields, locale: ShopLocale): string {
  if (locale === "am") {
    const am = p.nameAm?.trim();
    if (am) return am;
    return p.name?.trim() || "";
  }
  const en = p.name?.trim();
  if (en) return en;
  return p.nameAm?.trim() || "";
}

export function productDisplayDescription(
  p: ProductTextFields,
  locale: ShopLocale
): string | null {
  if (locale === "am") {
    const am = p.descriptionAm?.trim();
    if (am) return am;
    const en = p.description?.trim();
    return en || null;
  }
  const en = p.description?.trim();
  if (en) return en;
  const am = p.descriptionAm?.trim();
  return am || null;
}
