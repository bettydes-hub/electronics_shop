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
              const img = (Array.isArray(p.imageUrls) && p.imageUrls[0]) || p.imageUrl;
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

  const current = products[index] ?? products[0];
  const img = current
    ? (current.imageUrls && current.imageUrls[0]) || current.imageUrl || null
    : null;
  const imageLabel = current
    ? productDisplayName({ name: current.name, nameAm: current.nameAm ?? null }, locale)
    : t("popularProducts");

  return (
    <section className="w-full bg-white">
      <div className="grid w-full items-center lg:grid-cols-2">
        <div className="px-5 py-12 sm:px-10 lg:py-20 lg:pl-12 lg:pr-8">
          <p className="text-[15px] font-medium text-[#565959]">{t("heroKicker")}</p>
          <h1 className="mt-3 max-w-xl font-display text-[40px] font-medium leading-[1.05] tracking-tight text-[#0f1111] sm:text-5xl lg:text-[60px]">
            {t("heroTitle")}
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[#565959]">{t("heroBody")}</p>
          <Link
            href="/catalog"
            className="mt-8 inline-flex rounded-full bg-primary-700 px-7 py-3.5 text-[15px] font-semibold text-white transition hover:bg-primary-600"
          >
            {t("shopNow")}
          </Link>
          {products.length > 1 ? (
            <div className="mt-8 flex gap-2">
              {products.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  aria-label={productDisplayName({ name: p.name, nameAm: p.nameAm ?? null }, locale)}
                  onClick={() => setIndex(i)}
                  className={`h-2.5 rounded-full transition-all ${
                    i === index ? "w-6 bg-primary-700" : "w-2.5 bg-slate-300"
                  }`}
                />
              ))}
            </div>
          ) : null}
        </div>

        <div className="relative h-[380px] w-full overflow-hidden sm:h-[520px] lg:h-[640px]">
          <div className="absolute inset-y-8 left-[8%] right-0 rounded-l-[999px] bg-primary-100" />
          {loading ? null : img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={img}
              alt={imageLabel}
              className="absolute inset-0 z-10 h-full w-full object-contain object-bottom"
            />
          ) : (
            <div className="absolute inset-0 z-10 flex items-center justify-center text-[#565959]">
              {t("noFeaturedProducts")}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
