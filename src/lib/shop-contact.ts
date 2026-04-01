/** Customer-facing store contact. Default: NEXT_PUBLIC_* in .env; footer loads overrides from GET /api/shop-settings. */

export type ShopContact = {
  storeName: string;
  address: string;
  phone: string;
  tiktokUrl: string;
  instagramUrl: string;
  telegramUrl: string;
};

export function getShopContact(): ShopContact {
  return {
    storeName: process.env.NEXT_PUBLIC_SHOP_NAME?.trim() || "Electronics Shop",
    address: (
      process.env.NEXT_PUBLIC_SHOP_ADDRESS?.trim() ||
      "Add your store address in .env (NEXT_PUBLIC_SHOP_ADDRESS)"
    ).replace(/\\n/g, "\n"),
    phone: process.env.NEXT_PUBLIC_SHOP_PHONE?.trim() || "",
    tiktokUrl: process.env.NEXT_PUBLIC_SHOP_TIKTOK_URL?.trim() || "",
    instagramUrl: process.env.NEXT_PUBLIC_SHOP_INSTAGRAM_URL?.trim() || "",
    telegramUrl: process.env.NEXT_PUBLIC_SHOP_TELEGRAM_URL?.trim() || "",
  };
}

export function phoneToTelHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : "#";
}
