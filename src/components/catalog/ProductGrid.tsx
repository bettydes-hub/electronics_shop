"use client";

import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/context/CartContext";
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
  const { addItem } = useCart();
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
      <div className="mb-6 flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-slate-900">{heading}</h2>

        {showSearch && (
          <div className="flex flex-col gap-2 sm:max-w-xl">
            <label htmlFor="product-search" className="text-sm font-medium text-slate-600">
              {t("productSearchLabel")}
            </label>
            <input
              id="product-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("productSearchPlaceholder")}
              autoComplete="off"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-80 animate-pulse rounded-xl bg-slate-200" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-600">{emptyMessage}</p>
          {debouncedSearch.trim() && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setDebouncedSearch("");
              }}
              className="mt-3 text-sm font-medium text-primary-600 hover:underline"
            >
              {t("clearSearch")}
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const imgs =
              p.imageUrls && p.imageUrls.length > 0 ? p.imageUrls : p.imageUrl ? [p.imageUrl] : [];
            return <ProductCard key={p.id} product={p} images={imgs} addItem={addItem} />;
          })}
        </div>
      )}
    </section>
  );
}

type FeaturedProductsProps = { className?: string };

/** Homepage strip: top-selling products recorded by seller sales. */
export function FeaturedProducts({ className = "" }: FeaturedProductsProps) {
  const { t } = useShopLocale();
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const { addItem } = useCart();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/products/top-sellers?limit=8")
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
      <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-72 animate-pulse rounded-xl bg-slate-200" />
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <p className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        {t("noFeaturedProducts")}
      </p>
    );
  }

  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
      {products.map((p) => {
        const imgs =
          p.imageUrls && p.imageUrls.length > 0 ? p.imageUrls : p.imageUrl ? [p.imageUrl] : [];
        return <ProductCard key={p.id} product={p} images={imgs} addItem={addItem} />;
      })}
    </div>
  );
}
