"use client";

import { useEffect, useMemo, useState } from "react";
import { useShopLocale } from "@/context/LocaleContext";
import { CatalogProduct, ProductCard } from "@/components/catalog/ProductCard";

function buildProductsUrl(opts: {
  categorySlug?: string | null;
  q: string;
  featured?: boolean;
  limit?: number;
}): string {
  const p = new URLSearchParams();
  if (opts.categorySlug) p.set("categorySlug", opts.categorySlug);
  if (opts.q.trim()) p.set("q", opts.q.trim());
  if (opts.featured) p.set("featured", "1");
  if (opts.limit != null) p.set("limit", String(opts.limit));
  const qs = p.toString();
  return qs ? `/api/products?${qs}` : "/api/products";
}

type ProductGridProps = {
  title?: string;
  className?: string;
  showSearch?: boolean;
  categorySlug?: string | null;
};

export function ProductGrid({
  title,
  className = "",
  showSearch = true,
  categorySlug = null,
}: ProductGridProps) {
  const { t } = useShopLocale();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const heading = title ?? t("productCatalog");

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const url = buildProductsUrl({
      categorySlug,
      q: debouncedSearch,
    });
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setProducts(Array.isArray(data) ? data : []);
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
  }, [categorySlug, debouncedSearch]);

  const emptyMessage = useMemo(() => {
    if (debouncedSearch.trim()) {
      return t("noProductsSearch");
    }
    return categorySlug ? t("noProductsCategory") : t("noProductsYet");
  }, [debouncedSearch, categorySlug, t]);

  return (
    <section className={className}>
      <div className="mb-4 flex flex-col gap-3">
        <h2 className="text-[21px] font-bold text-[#0f1111]">{heading}</h2>

        {showSearch && (
          <div className="flex w-full flex-col gap-1 sm:max-w-2xl">
            <label htmlFor="product-search" className="text-[13px] font-medium text-[#565959]">
              {t("productSearchLabel")}
            </label>
            <input
              id="product-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("productSearchPlaceholder")}
              autoComplete="off"
              className="w-full border border-[#d5d9d9] bg-white px-3 py-2 text-[15px] text-[#0f1111] outline-none focus:border-[#007185] focus:shadow-[0_0_0_3px_rgba(0,113,133,0.2)]"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="aspect-[4/5] animate-pulse bg-white" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white p-12 text-center">
          <p className="text-[#565959]">{emptyMessage}</p>
          {debouncedSearch.trim() && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
              }}
              className="mt-3 text-[14px] font-medium text-amazon-link hover:underline"
            >
              {t("clearSearch")}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {products.map((p) => {
            const imgs =
              p.imageUrls && p.imageUrls.length > 0 ? p.imageUrls : p.imageUrl ? [p.imageUrl] : [];
            return <ProductCard key={p.id} product={p} images={imgs} />;
          })}
        </div>
      )}
    </section>
  );
}

type FeaturedProductsProps = { className?: string };

/** Homepage strip: recent / featured catalog products. */
export function FeaturedProducts({ className = "" }: FeaturedProductsProps) {
  const { t } = useShopLocale();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/products?limit=8")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setProducts(Array.isArray(data) ? data : []);
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

  if (loading) {
    return (
      <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-[4/5] animate-pulse bg-[#f0f2f2]" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return <p className="p-8 text-center text-[#565959]">{t("noFeaturedProducts")}</p>;
  }

  return (
    <div className={`grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 ${className}`}>
      {products.map((p) => {
        const imgs =
          p.imageUrls && p.imageUrls.length > 0 ? p.imageUrls : p.imageUrl ? [p.imageUrl] : [];
        return <ProductCard key={p.id} product={p} images={imgs} />;
      })}
    </div>
  );
}
