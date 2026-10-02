"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useShopLocale } from "@/context/LocaleContext";
import { ShopNav } from "@/components/catalog/ShopNav";
import { PageBack } from "@/components/ui/PageBack";
import { formatMoney } from "@/lib/format-money";
import { categoryDisplayName } from "@/lib/category-i18n";
import { productDisplayDescription, productDisplayName } from "@/lib/products-i18n";
import { categoryPathSlug } from "@/lib/slug";

type Product = {
  id: string;
  name: string;
  nameAm?: string | null;
  description: string | null;
  descriptionAm?: string | null;
  price: number;
  effectivePrice?: number;
  listPrice?: number;
  category: string | null;
  categoryRef?: { name: string; nameAm?: string | null; slug?: string | null } | null;
  imageUrl: string | null;
  imageUrls?: string[];
  stock: number;
};

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { locale, t } = useShopLocale();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [mainIndex, setMainIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const pRes = await fetch(`/api/products/${id}`);
      if (cancelled) return;
      if (pRes.ok) {
        const p = await pRes.json();
        setProduct(p.error ? null : p);
      } else setProduct(null);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const images =
    product && (product.imageUrls?.length ?? 0) > 0
      ? product.imageUrls!
      : product?.imageUrl
        ? [product.imageUrl]
        : [];
  const mainImg = images[mainIndex] ?? images[0];

  const unitPrice = product ? product.effectivePrice ?? product.price : 0;

  const displayName = useMemo(
    () => (product ? productDisplayName(product, locale) : ""),
    [product, locale]
  );
  const displayDesc = useMemo(
    () => (product ? productDisplayDescription(product, locale) : null),
    [product, locale]
  );

  const categoryEnName = product?.categoryRef?.name ?? product?.category ?? null;
  const categorySlug = product?.categoryRef?.slug ?? null;
  const categoryHref =
    categoryEnName?.trim() != null && categoryEnName.trim() !== ""
      ? `/catalog/category/${encodeURIComponent(categoryPathSlug(categoryEnName.trim(), categorySlug))}`
      : null;
  const categoryLabel =
    product && categoryEnName?.trim()
      ? categoryDisplayName(
          { name: categoryEnName.trim(), nameAm: product.categoryRef?.nameAm ?? null },
          locale
        )
      : null;

  if (product === undefined) {
    return (
      <div className="flex flex-1 flex-col bg-amazon-bg">
        <ShopNav current="other" theme="dark" />
        <div className="w-full px-3 pt-4">
          <PageBack href="/catalog" ariaLabel={t("backToCatalog")} />
        </div>
        <p className="p-8 text-center text-[#565959]">{t("loading")}</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-1 flex-col bg-amazon-bg">
        <ShopNav current="other" theme="dark" />
        <div className="w-full px-3 py-4">
          <PageBack href="/catalog" ariaLabel={t("backToCatalog")} />
        </div>
        <main className="w-full flex-1 px-3 py-16 text-center">
          <p className="text-[#565959]">{t("productNotFound")}</p>
          <Link href="/" className="mt-4 inline-block text-amazon-link hover:underline">
            {t("backToHome")}
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col bg-amazon-bg">
      <ShopNav current="other" theme="dark" />
      <div className="flex w-full items-center gap-2 px-3 py-3 text-[13px] text-[#565959]">
        <PageBack href="/catalog" ariaLabel={t("backToCatalog")} />
        <span className="text-slate-400">·</span>
        <Link href="/" className="text-amazon-link hover:underline">
          {t("navHome")}
        </Link>
        <span className="text-slate-400">/</span>
        <Link href="/catalog" className="text-amazon-link hover:underline">
          {t("breadcrumbCatalog")}
        </Link>
      </div>

      <main className="w-full flex-1 px-2 pb-10 sm:px-3 lg:px-4">
        <div className="grid gap-4 bg-white p-2 shadow-[0_2px_5px_rgba(15,17,17,0.12)] lg:grid-cols-2 lg:gap-6 lg:p-4">
          <div>
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#f7f7f7] sm:aspect-square lg:min-h-[480px]">
              {mainImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mainImg}
                  alt={displayName}
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-6xl text-slate-300">—</div>
              )}
              {product.stock <= 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                  <span className="rounded bg-[#0f1111] px-4 py-2 font-medium text-white">
                    {t("outOfStock")}
                  </span>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {images.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setMainIndex(i)}
                    className={`h-20 w-20 shrink-0 overflow-hidden border-2 sm:h-24 sm:w-24 ${
                      i === mainIndex ? "border-[#0f1111]" : "border-[#d5d9d9] opacity-80 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="px-2 pb-4 pt-2 sm:px-4">
            {categoryHref && categoryLabel ? (
              <Link
                href={categoryHref}
                className="text-[13px] font-medium text-amazon-link hover:underline"
              >
                {categoryLabel}
              </Link>
            ) : null}
            <h1 className="mt-1 text-[28px] font-bold leading-tight text-[#0f1111] sm:text-[32px]">
              {displayName}
            </h1>
            <p className="mt-4 text-[28px] font-bold text-[#0f1111]">{formatMoney(unitPrice)}</p>
            <p className="mt-2 text-[14px] text-[#565959]">
              {product.stock} {t("inStock")}
            </p>

            <div className="mt-6 border-t border-[#e7e7e7] pt-5">
              <h2 className="text-[16px] font-bold text-[#0f1111]">{t("descriptionHeading")}</h2>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-[#0f1111]">
                {displayDesc?.trim() ? displayDesc.trim() : t("noDescription")}
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
