"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useShopLocale } from "@/context/LocaleContext";
import { ShopNav } from "@/components/catalog/ShopNav";
import { PageBack } from "@/components/ui/PageBack";
import { formatMoney } from "@/lib/format-money";

export default function CartPage() {
  const { t } = useShopLocale();
  const { items, removeItem, updateQuantity, clearCart } = useCart();
  const [serverTotal, setServerTotal] = useState<number | null>(null);
  const [couponPreview, setCouponPreview] = useState("");
  const [quoteDiscount, setQuoteDiscount] = useState<number | null>(null);

  useEffect(() => {
    if (items.length === 0) {
      setServerTotal(null);
      setQuoteDiscount(null);
      return;
    }
    let cancelled = false;
    fetch("/api/orders/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        couponCode: couponPreview.trim() || undefined,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || data.error) {
          setServerTotal(null);
          setQuoteDiscount(null);
          return;
        }
        if (typeof data.total === "number") setServerTotal(data.total);
        if (typeof data.discountTotal === "number") setQuoteDiscount(data.discountTotal);
      })
      .catch(() => {
        if (!cancelled) {
          setServerTotal(null);
          setQuoteDiscount(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [items, couponPreview]);

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <ShopNav current="other" />
        <div className="mx-auto flex w-full max-w-6xl px-4 pt-4">
          <PageBack href="/" ariaLabel={t("backToHome")} />
        </div>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16 text-center">
          <h1 className="mb-4 text-2xl font-bold text-slate-900">{t("cartEmptyTitle")}</h1>
          <p className="mb-6 text-slate-600">{t("cartEmptyHint")}</p>
          <Link
            href="/catalog"
            className="inline-block rounded-lg bg-primary-600 px-6 py-3 font-medium text-white hover:bg-primary-700"
          >
            {t("browseProducts")}
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <ShopNav current="other" />
      <div className="mx-auto flex w-full max-w-6xl px-4 pt-4">
        <PageBack href="/catalog" ariaLabel={t("backToCatalog")} />
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">{t("cartYourCart")}</h1>
          <button
            type="button"
            onClick={clearCart}
            className="text-sm font-medium text-red-600 hover:text-red-700"
          >
            {t("cartClear")}
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl text-slate-300">—</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-slate-900">{item.name}</h2>
                <p className="text-sm text-slate-500">
                  {formatMoney(item.price)} {t("cartEach")}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    className="ml-2 text-sm text-red-600 hover:text-red-700"
                  >
                    {t("cartRemove")}
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">
                  {formatMoney(item.price * item.quantity)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <label className="block text-left text-sm font-medium text-slate-700">
            {t("couponTryLabel")}
            <input
              type="text"
              value={couponPreview}
              onChange={(e) => setCouponPreview(e.target.value.toUpperCase())}
              placeholder="SAVE20"
              className="mt-1 w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 uppercase"
            />
          </label>
          <div className="text-right">
            <p className="text-sm text-slate-600">{t("cartSubtotalSaved")}</p>
            <p className="text-lg font-bold text-slate-900">
              {formatMoney(items.reduce((s, i) => s + i.price * i.quantity, 0))}
            </p>
            {serverTotal != null ? (
              <>
                <p className="mt-2 text-sm text-slate-600">
                  {t("cartLiveTotal")}
                  {couponPreview.trim() ? t("cartLiveTotalCoupon") : ""}
                  {t("cartLiveTotalEnd")}{" "}
                  <span className="font-semibold text-primary-700">{formatMoney(serverTotal)}</span>
                </p>
                {quoteDiscount != null && quoteDiscount > 0 ? (
                  <p className="text-xs text-emerald-700">
                    {t("couponDiscountLine")} −{formatMoney(quoteDiscount)}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
