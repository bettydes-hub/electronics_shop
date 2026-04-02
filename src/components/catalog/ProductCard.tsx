"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useShopLocale } from "@/context/LocaleContext";
import { formatMoney } from "@/lib/format-money";
import { categoryDisplayName } from "@/lib/category-i18n";
import { productDisplayDescription, productDisplayName } from "@/lib/products-i18n";
import { categoryPathSlug } from "@/lib/slug";

export type CatalogProduct = {
  id: string;
  name: string;
  nameAm?: string | null;
  description: string | null;
  descriptionAm?: string | null;
  price: number;
  /** Server-computed price after dynamic rules + active promotions */
  effectivePrice?: number;
  listPrice?: number;
  promotionLabel?: string | null;
  isFlashSale?: boolean;
  category: string | null;
  categoryRef?: { name: string; nameAm?: string | null; slug?: string | null } | null;
  imageUrl: string | null;
  imageUrls?: string[];
  stock: number;
  avgRating?: number | null;
  reviewCount?: number;
};

export function ProductCard({
  product: p,
  images,
  addItem,
}: {
  product: CatalogProduct;
  images: string[];
  addItem: (item: { productId: string; name: string; price: number; imageUrl: string | null }) => void;
}) {
  const { locale, t } = useShopLocale();
  const [imgIndex, setImgIndex] = useState(0);
  const reduce = useReducedMotion();
  const mainImg = images[imgIndex] ?? images[0];
  const displayName = productDisplayName(
    { name: p.name, nameAm: p.nameAm ?? null, description: p.description, descriptionAm: p.descriptionAm ?? null },
    locale
  );
  const displayDesc = productDisplayDescription(
    { name: p.name, nameAm: p.nameAm ?? null, description: p.description, descriptionAm: p.descriptionAm ?? null },
    locale
  );
  const unitPrice = p.effectivePrice ?? p.price;
  const listPrice = p.listPrice ?? p.price;
  const onSale = unitPrice < listPrice - 0.005;
  const avgRating = p.avgRating ?? null;
  const reviewCount = p.reviewCount ?? 0;
  const roundedRating = avgRating != null ? Math.round(avgRating) : 0;

  const categoryEnName = p.categoryRef?.name ?? p.category;
  const categoryHref =
    categoryEnName != null && String(categoryEnName).trim()
      ? `/catalog/category/${encodeURIComponent(categoryPathSlug(String(categoryEnName), p.categoryRef?.slug ?? null))}`
      : null;
  const categoryLabel =
    categoryEnName != null && String(categoryEnName).trim()
      ? categoryDisplayName(
          { name: String(categoryEnName), nameAm: p.categoryRef?.nameAm ?? null },
          locale
        )
      : null;

  return (
    <motion.article
      layout
      className="group/product overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-colors hover:border-primary-200/80"
      initial={reduce ? false : { opacity: 0, y: 24, scale: 0.98 }}
      whileInView={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{
        type: "spring",
        stiffness: 380,
        damping: 26,
        opacity: { duration: 0.35 },
      }}
      whileHover={
        reduce
          ? undefined
          : {
              y: -8,
              boxShadow: "0 22px 44px -14px rgb(0 0 0 / 0.2)",
              transition: { type: "spring", stiffness: 400, damping: 24 },
            }
      }
    >
      {categoryHref && categoryLabel ? (
        <div className="border-b border-slate-100 px-4 pt-3">
          <Link
            href={categoryHref}
            className="text-xs font-medium uppercase tracking-wide text-primary-600 hover:underline"
          >
            {categoryLabel}
          </Link>
        </div>
      ) : null}
      <Link href={`/catalog/${p.id}`} className="block">
        <div className="relative aspect-square overflow-hidden bg-slate-100">
          <div className="relative h-full w-full origin-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/product:scale-[1.08]">
            {mainImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mainImg} alt={displayName} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-4xl text-slate-300">—</div>
            )}
          </div>
          {images.length > 1 && (
            <div
              className="absolute bottom-2 left-0 right-0 z-10 flex justify-center gap-1"
              onClick={(e) => e.preventDefault()}
            >
              {images.map((_, i) => (
                <motion.button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setImgIndex(i);
                  }}
                  whileHover={reduce ? undefined : { scale: 1.3 }}
                  whileTap={reduce ? undefined : { scale: 0.85 }}
                  transition={{ type: "spring", stiffness: 500, damping: 22 }}
                  className={`h-2 w-2 rounded-full ${i === imgIndex ? "bg-white shadow-sm ring-1 ring-black/10" : "bg-white/50"}`}
                  aria-label={`Image ${i + 1}`}
                />
              ))}
            </div>
          )}
          {(p.promotionLabel || p.isFlashSale) && p.stock > 0 && (
            <div className="absolute left-2 top-2 z-[5] rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white shadow">
              {p.isFlashSale ? t("flashOffer") : t("offerBadge")}
            </div>
          )}
          {p.stock <= 0 && (
            <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-slate-900/50">
              <span className="rounded bg-slate-800 px-3 py-1 font-medium text-white">{t("outOfStock")}</span>
            </div>
          )}
        </div>
        <div className="p-4 pb-2">
          <h2 className="font-semibold text-slate-900 transition-colors group-hover/product:text-primary-700">
            {displayName}
          </h2>
          {displayDesc ? (
            <p className="mt-1 line-clamp-2 text-sm text-slate-600">{displayDesc}</p>
          ) : null}
          <div className="mt-2 flex items-center gap-2 text-sm">
            <span className="text-amber-500" aria-label={`${roundedRating} out of 5 stars`}>
              {"★".repeat(roundedRating)}
              <span className="text-slate-300">{"★".repeat(5 - roundedRating)}</span>
            </span>
            <span className="text-slate-500">
              {avgRating != null ? avgRating.toFixed(1) : t("noRating")} ({reviewCount})
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <p className="text-lg font-bold text-primary-600 transition-transform duration-300 group-hover/product:translate-x-0.5">
              {formatMoney(unitPrice)}
            </p>
            {onSale ? (
              <p className="text-sm text-slate-400 line-through">{formatMoney(listPrice)}</p>
            ) : null}
          </div>
          {p.promotionLabel ? (
            <p className="mt-0.5 text-xs font-medium text-amber-700">{p.promotionLabel}</p>
          ) : null}
          <p className="mt-1 text-xs text-primary-600 opacity-90 transition-opacity group-hover/product:opacity-100 group-hover/product:underline">
            {t("viewDetailsReviews")}
          </p>
        </div>
      </Link>
      <div className="flex items-center justify-between px-4 pb-4">
        <p className="text-xs text-slate-500">
          {p.stock} {t("inStock")}
        </p>
        <motion.button
          type="button"
          onClick={() =>
            addItem({ productId: p.id, name: displayName, price: unitPrice, imageUrl: images[0] ?? null })
          }
          disabled={p.stock <= 0}
          whileHover={p.stock <= 0 || reduce ? undefined : { scale: 1.05 }}
          whileTap={p.stock <= 0 || reduce ? undefined : { scale: 0.94 }}
          transition={{ type: "spring", stiffness: 500, damping: 22 }}
          className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t("addToCart")}
        </motion.button>
      </div>
    </motion.article>
  );
}
