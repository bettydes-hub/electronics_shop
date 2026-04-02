"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FeaturedProducts } from "@/components/catalog/ProductGrid";
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
  _count: { products: number };
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
  const reduce = useReducedMotion();

  const homeOfferTiles = [
    { key: "homeOfferLaptops" as const },
    { key: "homeOfferScreens" as const },
    { key: "homeOfferGaming" as const },
    { key: "homeOfferAccessories" as const },
  ];

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
    <div className="flex min-h-screen flex-col bg-slate-50">
      <ShopNav current="home" theme="dark" />

      <section className="relative overflow-hidden bg-gradient-to-b from-white to-slate-50 pb-16 pt-4 text-slate-900">
        <div className="pointer-events-none absolute inset-0">
          {!reduce && (
            <>
              <motion.div
                className="absolute -left-24 top-20 h-72 w-72 rounded-full bg-primary-400/20 blur-[100px]"
                animate={{ x: [0, 40, 0], y: [0, 24, 0], scale: [1, 1.08, 1] }}
                transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.div
                className="absolute -right-16 top-32 h-80 w-80 rounded-full bg-sky-300/25 blur-[100px]"
                animate={{ x: [0, -36, 0], y: [0, 28, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
              />
            </>
          )}
        </div>

        <div className="relative z-10 mx-auto w-full max-w-6xl px-4">
          <FirstSetupBanner variant="light" className="mb-8" />

        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
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
                      <span className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-50 text-2xl text-primary-600">
                        {c.name.charAt(0).toUpperCase()}
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

        <section className="mb-12">
          <h2 className="mb-6 text-center text-3xl font-bold text-slate-900">{t("topOffers")}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {homeOfferTiles.map(({ key }, i) => (
              <Link
                key={key}
                href="/catalog"
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              >
                <div
                  className={`h-40 ${
                    i % 4 === 0
                      ? "bg-gradient-to-br from-primary-100 to-primary-200"
                      : i % 4 === 1
                        ? "bg-gradient-to-br from-slate-100 to-slate-200"
                        : i % 4 === 2
                          ? "bg-gradient-to-br from-primary-200 to-primary-300"
                          : "bg-gradient-to-br from-emerald-100 to-primary-100"
                  }`}
                />
                <div className="p-4">
                  <p className="font-semibold text-slate-900 group-hover:text-primary-700">{t(key)}</p>
                  <p className="mt-1 text-sm text-slate-500">{t("shopNow")}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

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
