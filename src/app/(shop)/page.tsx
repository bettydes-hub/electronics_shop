"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FeaturedProducts } from "@/components/catalog/ProductGrid";
import { HomeHeroBanner } from "@/components/catalog/HomeHeroBanner";
import { ShopNav } from "@/components/catalog/ShopNav";
import { FirstSetupBanner } from "@/components/staff/FirstSetupBanner";
import { categoryDisplayName } from "@/lib/category-i18n";
import { useShopLocale } from "@/context/LocaleContext";
import { categoryPathSlug } from "@/lib/slug";

type CategoryRow = {
  id: string;
  name: string;
  nameAm?: string | null;
  slug: string | null;
  previewImageUrl?: string | null;
  _count: { products: number };
};

export default function ShopHomePage() {
  const { t, locale } = useShopLocale();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setCategories(Array.isArray(data) ? data : []);
        setLoadingCats(false);
      })
      .catch(() => {
        if (cancelled) return;
        setCategories([]);
        setLoadingCats(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-amazon-bg">
      <ShopNav current="home" theme="dark" />

      <HomeHeroBanner />

      <main className="w-full flex-1 px-2 pb-10 pt-3 sm:px-3 lg:px-4">
        <FirstSetupBanner variant="light" className="mb-4" />

        <section className="mb-4">
          <h2 className="mb-3 px-1 text-[21px] font-bold text-[#0f1111]">{t("shopByCategory")}</h2>
          {loadingCats ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-48 animate-pulse bg-white sm:h-56" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <p className="bg-white p-8 text-center text-[#565959]">{t("noCategoriesYet")}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {categories.slice(0, 6).map((c) => {
                const pathSlug = categoryPathSlug(c.name, c.slug);
                const label = categoryDisplayName({ name: c.name, nameAm: c.nameAm }, locale);
                return (
                  <li key={c.id}>
                    <Link
                      href={`/catalog/category/${encodeURIComponent(pathSlug)}`}
                      className="group flex h-full flex-col bg-white p-3 shadow-[0_2px_5px_rgba(15,17,17,0.12)] sm:p-4"
                    >
                      <h3 className="mb-2 line-clamp-2 text-[16px] font-bold leading-snug text-[#0f1111]">
                        {label}
                      </h3>
                      <div className="relative flex min-h-[160px] flex-1 items-center justify-center overflow-hidden rounded-md bg-[#f7fafa] sm:min-h-[200px]">
                        {c.previewImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.previewImageUrl}
                            alt={label}
                            loading="lazy"
                            decoding="async"
                            className="max-h-full max-w-full object-contain p-2 transition-opacity duration-300 group-hover:opacity-95"
                          />
                        ) : (
                          <div className="flex h-full min-h-[160px] items-center justify-center text-4xl font-bold text-primary-300 sm:min-h-[200px]">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <span className="mt-3 text-[13px] font-medium text-primary-700 group-hover:underline">
                        {t("shopNow")}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="mb-6 bg-white p-3 shadow-[0_2px_5px_rgba(15,17,17,0.12)] sm:p-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2 border-b border-[#e7e7e7] pb-3">
            <h2 className="text-[21px] font-bold text-[#0f1111]">{t("popularProducts")}</h2>
            <Link href="/catalog" className="text-[14px] font-medium text-primary-700 hover:underline">
              {t("viewAllProducts")}
            </Link>
          </div>
          <FeaturedProducts />
        </section>
      </main>
    </div>
  );
}
