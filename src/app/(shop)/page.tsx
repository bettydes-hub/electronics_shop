"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FeaturedProducts } from "@/components/catalog/ProductGrid";
import { ShopNav } from "@/components/catalog/ShopNav";
import { FirstSetupBanner } from "@/components/staff/FirstSetupBanner";
import { categoryPathSlug } from "@/lib/slug";

type CategoryRow = {
  id: string;
  name: string;
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
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loadingCats, setLoadingCats] = useState(true);
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

          <motion.div
            className="relative flex flex-col items-center text-center"
            initial={reduce ? false : { opacity: 0, y: 32, scale: 0.97 }}
            animate={reduce ? false : { opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.8, ease: easeOut }}
            whileHover={reduce ? undefined : { scale: 1.015 }}
          >
            <motion.span
              className="pointer-events-none absolute -top-8 h-24 w-24 rounded-full bg-primary-300/30 blur-2xl"
              aria-hidden
              animate={reduce ? undefined : { scale: [1, 1.15, 1], opacity: [0.5, 0.85, 0.5] }}
              transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.p
              className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-primary-600"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={reduce ? false : { opacity: 1, y: [0, -3, 0] }}
              transition={{
                opacity: { delay: 0.08, duration: 0.45, ease: easeOut },
                y: { delay: 0.55, duration: 2.6, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              Welcome
            </motion.p>
            <motion.h1
              className="max-w-3xl bg-gradient-to-r from-slate-900 via-primary-700 to-slate-900 bg-clip-text text-4xl font-extrabold leading-tight tracking-tight text-transparent sm:text-5xl lg:text-6xl"
              style={{ backgroundSize: "200% auto" }}
              initial={reduce ? false : { opacity: 0, y: 14 }}
              animate={
                reduce
                  ? false
                  : { opacity: 1, y: [0, -4, 0], backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }
              }
              transition={{
                opacity: { delay: 0.16, duration: 0.55, ease: easeOut },
                y: { delay: 0.72, duration: 3.2, repeat: Infinity, ease: "easeInOut" },
                backgroundPosition: { duration: 4.8, repeat: Infinity, ease: "linear" },
              }}
            >
              Electronics Shop
            </motion.h1>
          </motion.div>

        </div>
      </section>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
        <motion.section
          className="mb-16"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.55, ease: easeOut }}
        >
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Curated</p>
              <h2 className="mt-1 text-3xl font-bold text-slate-900">Featured products</h2>
            </div>
            <Link
              href="/catalog"
              className="text-sm font-semibold text-primary-600 hover:underline"
            >
              View full catalog →
            </Link>
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

        <motion.section
          initial={reduce ? false : { opacity: 0, y: 28 }}
          whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease: easeOut }}
        >
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Browse</p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900">Categories</h2>
            <p className="mt-2 max-w-lg text-sm text-slate-600">
              Pick a category to see everything in that aisle—phones, accessories, and more.
            </p>
          </div>

          {loadingCats ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-200" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              No categories yet. An admin can add them from the product admin.
            </p>
          ) : (
            <motion.ul
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              variants={reduce ? staggerReduced : staggerContainer}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-20px" }}
            >
              {categories.map((c) => {
                const pathSlug = categoryPathSlug(c.name, c.slug);
                return (
                  <motion.li key={c.id} variants={reduce ? fadeUpItemReduced : fadeUpItem}>
                    <Link
                      href={`/catalog/category/${encodeURIComponent(pathSlug)}`}
                      className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-md"
                    >
                      <span className="text-lg font-semibold text-slate-900 group-hover:text-primary-600">
                        {c.name}
                      </span>
                      <span className="mt-1 text-sm text-slate-500">
                        {c._count.products} product{c._count.products === 1 ? "" : "s"}
                      </span>
                      <span className="mt-4 text-sm font-medium text-primary-600">Shop category →</span>
                    </Link>
                  </motion.li>
                );
              })}
            </motion.ul>
          )}
        </motion.section>
      </main>
    </div>
  );
}
