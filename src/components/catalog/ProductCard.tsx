"use client";

import Link from "next/link";
import { useState } from "react";
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
  effectivePrice?: number;
  listPrice?: number;
  category: string | null;
  categoryRef?: { name: string; nameAm?: string | null; slug?: string | null } | null;
  imageUrl: string | null;
  imageUrls?: string[];
  stock: number;
};

export function ProductCard({
  product: p,
  images,
}: {
  product: CatalogProduct;
  images: string[];
}) {
  const { locale, t } = useShopLocale();
  const [imgIndex, setImgIndex] = useState(0);
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
    <article className="flex h-full flex-col overflow-hidden bg-white shadow-[0_2px_5px_rgba(15,17,17,0.12)]">
      {categoryHref && categoryLabel ? (
        <div className="px-3 pt-3">
          <Link href={categoryHref} className="text-[13px] font-semibold text-amazon-link hover:underline">
            {categoryLabel}
          </Link>
        </div>
      ) : null}
      <Link href={`/catalog/${p.id}`} className="group flex flex-1 flex-col">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#f7f7f7] sm:aspect-[5/4]">
          {mainImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mainImg}
              alt={displayName}
              className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl text-slate-300">—</div>
          )}
          {images.length > 1 && (
            <div
              className="absolute bottom-2 left-0 right-0 z-10 flex justify-center gap-1.5"
              onClick={(e) => e.preventDefault()}
            >
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setImgIndex(i);
                  }}
                  className={`h-2 w-2 rounded-full ${i === imgIndex ? "bg-[#0f1111]" : "bg-[#0f1111]/35"}`}
                  aria-label={`Image ${i + 1}`}
                />
              ))}
            </div>
          )}
          {p.stock <= 0 && (
            <div className="pointer-events-none absolute inset-0 z-[5] flex items-center justify-center bg-black/45">
              <span className="rounded bg-[#0f1111] px-3 py-1 text-sm font-medium text-white">
                {t("outOfStock")}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <h2 className="line-clamp-2 text-[16px] font-bold leading-snug text-[#0f1111] group-hover:text-amazon-link">
            {displayName}
          </h2>
          {displayDesc ? (
            <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-[#565959]">{displayDesc}</p>
          ) : null}
          <p className="mt-auto pt-2 text-[18px] font-bold text-[#0f1111]">{formatMoney(unitPrice)}</p>
          <p className="mt-1 text-[13px] font-medium text-amazon-link">{t("viewDetails")}</p>
        </div>
      </Link>
    </article>
  );
}
