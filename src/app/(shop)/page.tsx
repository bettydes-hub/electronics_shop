"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FeaturedProducts } from "@/components/catalog/ProductGrid";
import { ShopNav } from "@/components/catalog/ShopNav";
import { FirstSetupBanner } from "@/components/staff/FirstSetupBanner";
import { categoryDisplayName } from "@/lib/category-i18n";
import { useShopLocale } from "@/context/LocaleContext";
import { productDisplayName } from "@/lib/products-i18n";
import { categoryPathSlug } from "@/lib/slug";

type CategoryRow = {
  id: string;
  name: string;
  nameAm?: string | null;
  slug: string | null;
  previewImageUrl?: string | null;
  _count: { products: number };
};

type OfferProduct = {
  id: string;
  name: string;
  nameAm?: string | null;
  imageUrl: string | null;
  imageUrls?: string[];
  promotionLabel?: string | null;
  promotionLabelAm?: string | null;
  isFlashSale?: boolean;
  promotionPercentOff?: number | null;
};

const easeOut = [0.22, 1, 0.36, 1] as const;

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.06 },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: easeOut },
  },
};

const fadeUpItemReduced = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0 },
};

const staggerReduced = {
  hidden: { opacity: 1 },
  show: { opacity: 1, transition: { staggerChildren: 0 } },
};

export default function ShopHomePage() {
  const { t, locale } = useShopLocale();
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [offerProducts, setOfferProducts] = useState<OfferProduct[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const reduce = useReducedMotion();

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

  useEffect(() => {
    let cancelled = false;
    fetch("/api/products?limit=24")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const offered = Array.isArray(data)
          ? data
              .filter(
                (p) =>
                  Boolean(p?.isFlashSale) ||
                  (typeof p?.promotionLabel === "string" && p.promotionLabel.trim()) ||
                  (typeof p?.promotionLabelAm === "string" && p.promotionLabelAm.trim())
              )
              .sort(
                (a, b) =>
                  Number(b?.promotionPercentOff ?? 0) - Number(a?.promotionPercentOff ?? 0)
              )
              .slice(0, 8)
          : [];
        setOfferProducts(offered);
        setLoadingOffers(false);
      })
      .catch(() => {
        if (cancelled) return;
        setOfferProducts([]);
        setLoadingOffers(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <ShopNav current="home" theme="dark" />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-3">
        <FirstSetupBanner variant="light" className="mb-6" />

        <section className="mb-12">
          <h2 className="mb-6 text-center text-3xl font-bold text-slate-900">{t("shopByCategory")}</h2>
          {loadingCats ? (
            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-32 animate-pulse rounded-xl bg-slate-200" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              {t("noCategoriesYet")}
            </p>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {categories.slice(0, 6).map((c) => {
                const pathSlug = categoryPathSlug(c.name, c.slug);
                return (
                  <li key={c.id}>
                    <Link
                      href={`/catalog/category/${encodeURIComponent(pathSlug)}`}
                      className="group flex flex-col items-center gap-3 rounded-xl p-3 text-center transition hover:bg-white hover:shadow-sm"
                    >
                      <span className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-primary-50 text-2xl text-primary-600">
                        {c.previewImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.previewImageUrl}
                            alt={categoryDisplayName({ name: c.name, nameAm: c.nameAm }, locale)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          c.name.charAt(0).toUpperCase()
                        )}
                      </span>
                      <span className="text-sm font-semibold text-slate-800 group-hover:text-primary-700">
                        {categoryDisplayName({ name: c.name, nameAm: c.nameAm }, locale)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {(loadingOffers || offerProducts.length > 0) && (
          <section className="mb-12">
            <h2 className="mb-6 text-center text-3xl font-bold text-slate-900">{t("topOffers")}</h2>
            {loadingOffers ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-52 animate-pulse rounded-xl bg-slate-200" />
                ))}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {offerProducts.map((p) => {
                  const img = p.imageUrls && p.imageUrls.length > 0 ? p.imageUrls[0] : p.imageUrl;
                  const displayName = productDisplayName(
                    { name: p.name, nameAm: p.nameAm ?? null },
                    locale
                  );
                  return (
                    <Link
                      key={p.id}
                      href={`/catalog/${p.id}`}
                      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    >
                      <div className="relative h-40 overflow-hidden bg-slate-100">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img}
                            alt={displayName}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-4xl text-slate-300">
                            —
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <p className="line-clamp-2 font-semibold text-slate-900 group-hover:text-primary-700">
                          {displayName}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">{t("shopNow")}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        )}

        <motion.section
          className="mb-16"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55, ease: easeOut }}
        >
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{t("trendingTag")}</p>
              <h2 className="mt-1 text-3xl font-bold text-slate-900">{t("popularProducts")}</h2>
            </div>
          </div>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: easeOut }}
          >
            <FeaturedProducts />
          </motion.div>
        </motion.section>

      </main>
    </div>
  );
}
