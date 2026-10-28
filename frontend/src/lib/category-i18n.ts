import type { ShopLocale } from "@/lib/shop-messages";

export type CategoryTextFields = {
  name: string;
  nameAm?: string | null;
};

/** One category, two languages — missing side falls back to the other. */
export function categoryDisplayName(c: CategoryTextFields, locale: ShopLocale): string {
  if (locale === "am") {
    const am = c.nameAm?.trim();
    if (am) return am;
    return c.name?.trim() || "";
  }
  const en = c.name?.trim();
  if (en) return en;
  return c.nameAm?.trim() || "";
}
