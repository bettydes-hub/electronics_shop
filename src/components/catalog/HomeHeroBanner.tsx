"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useShopLocale } from "@/context/LocaleContext";
import { productDisplayName } from "@/lib/products-i18n";

type HeroProduct = {
  id: string;
  name: string;
  nameAm?: string | null;
  imageUrl: string | null;
  imageUrls?: string[];
};

export function HomeHeroBanner() {
  const { locale, t } = useShopLocale();
  const [products, setProducts] = useState<HeroProduct[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/products?limit=8")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const withImages = Array.isArray(data)
          ? data.filter((p) => {
              const img =
                (Array.isArray(p.imageUrls) && p.imageUrls[0]) || p.imageUrl;
              return Boolean(img);
            })
          : [];
        setProducts(withImages.slice(0, 6));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setProducts([]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (products.length < 2) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % products.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [products.length]);

  if (loading) {
    return (
      <div className="relative h-[42vh] min-h-[280px] max-h-[520px] w-full animate-pulse bg-slate-300 sm:h-[52vh]" />
    );
  }

  if (products.length === 0) {
    return (
      <div className="relative flex h-[36vh] min-h-[240px] w-full items-center justify-center bg-primary-700 text-white">
        <div className="px-4 text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">{t("popularProducts")}</h1>
          <Link href="/catalog" className="mt-4 inline-block text-primary-200 underline">
            {t("browseProducts")}
          </Link>
        </div>
      </div>
    );
  }

  const current = products[index] ?? products[0];
  const img =
    (current.imageUrls && current.imageUrls[0]) || current.imageUrl || null;
  const title = productDisplayName(
    { name: current.name, nameAm: current.nameAm ?? null },
    locale
  );

  return (
    <section className="relative w-full">
      <Link href={`/catalog/${current.id}`} className="group block">
        <div className="relative h-[42vh] min-h-[280px] max-h-[560px] w-full overflow-hidden bg-primary-800 sm:h-[52vh] lg:h-[58vh]">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-700 group-hover:scale-[1.02]"
            />
          ) : null}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-8 lg:p-10">
            <p className="text-sm font-medium uppercase tracking-wide text-white/80">
              {t("trendingTag")}
            </p>
            <h1 className="mt-1 max-w-3xl text-2xl font-bold leading-tight text-white sm:text-4xl lg:text-5xl">
              {title}
            </h1>
            <span className="mt-3 inline-block rounded-sm bg-primary-500 px-4 py-2 text-[15px] font-semibold text-white">
              {t("shopNow")}
            </span>
          </div>
        </div>
      </Link>

      {products.length > 1 ? (
        <>
          <button
            type="button"
            aria-label="Previous"
            onClick={() => setIndex((i) => (i - 1 + products.length) % products.length)}
            className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl font-bold text-[#0f1111] shadow-md transition hover:bg-white sm:left-4 sm:h-12 sm:w-12 sm:text-3xl"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next"
            onClick={() => setIndex((i) => (i + 1) % products.length)}
            className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl font-bold text-[#0f1111] shadow-md transition hover:bg-white sm:right-4 sm:h-12 sm:w-12 sm:text-3xl"
          >
            ›
          </button>
        </>
      ) : null}
    </section>
  );
}
