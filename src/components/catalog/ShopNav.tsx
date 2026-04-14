"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useShopLocale } from "@/context/LocaleContext";
import { LanguageSwitcher } from "@/components/catalog/LanguageSwitcher";
import { categoryDisplayName } from "@/lib/category-i18n";
import { productDisplayName } from "@/lib/products-i18n";
import type { ShopLocale } from "@/lib/shop-messages";
import { categoryPathSlug } from "@/lib/slug";

type Theme = "light" | "dark";
type NavCategory = { id: string; name: string; nameAm: string | null; slug: string | null };
type SearchSuggestion = {
  id: string;
  name: string;
  nameAm: string | null;
  category: string | null;
  categoryRef: { name: string; nameAm?: string | null } | null;
};

function suggestionCategoryLabel(item: SearchSuggestion, loc: ShopLocale): string | null {
  const en = item.categoryRef?.name ?? item.category;
  if (!en?.trim()) return null;
  return categoryDisplayName({ name: en, nameAm: item.categoryRef?.nameAm ?? null }, loc);
}

export function ShopNav({
  current,
  theme = "light",
}: {
  current?: "home" | "catalog" | "other";
  theme?: Theme;
}) {
  const { totalItems } = useCart();
  const { locale, t } = useShopLocale();
  const router = useRouter();
  const dark = theme === "dark";
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [categories, setCategories] = useState<NavCategory[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setCategories(
          Array.isArray(data)
            ? data.slice(0, 5).map((c: { id: string; name: string; nameAm?: string | null; slug?: string | null }) => ({
                id: String(c.id),
                name: String(c.name),
                nameAm: typeof c.nameAm === "string" ? c.nameAm : null,
                slug: c.slug != null ? String(c.slug) : null,
              }))
            : []
        );
      })
      .catch(() => {
        if (cancelled) return;
        setCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setSuggestions([]);
      setSuggestOpen(false);
      return;
    }

    let cancelled = false;
    const debounceTimer = window.setTimeout(async () => {
      try {
        const res = await fetch(`/api/products?q=${encodeURIComponent(q)}&limit=6`);
        const data = await res.json();
        if (cancelled) return;
        const list = Array.isArray(data)
          ? data
              .map((p) => {
                const ref =
                  p.categoryRef && typeof p.categoryRef === "object"
                    ? {
                        name: String(p.categoryRef.name ?? ""),
                        nameAm:
                          typeof p.categoryRef.nameAm === "string" ? p.categoryRef.nameAm : null,
                      }
                    : null;
                return {
                  id: String(p.id ?? ""),
                  name: String(p.name ?? ""),
                  nameAm: typeof p.nameAm === "string" ? p.nameAm : null,
                  category: typeof p.category === "string" ? p.category : null,
                  categoryRef: ref,
                };
              })
              .filter((p) => p.id && (p.name || p.nameAm))
          : [];
        setSuggestions(list);
        setSuggestOpen(list.length > 0);
      } catch {
        if (cancelled) return;
        setSuggestions([]);
        setSuggestOpen(false);
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(debounceTimer);
    };
  }, [search]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = search.trim();
    setSuggestOpen(false);
    router.push(q ? `/catalog?q=${encodeURIComponent(q)}` : "/catalog");
  };

  return (
    <nav className={dark ? "border-b border-primary-800/50 bg-primary-700" : "border-b border-slate-200 bg-white"}>
      <div className={dark ? "border-b border-primary-600/70 bg-primary-600/90" : "border-b border-slate-200 bg-slate-50"}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-3 px-4 py-2 text-xs">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <LanguageSwitcher theme={dark ? "dark" : "light"} />
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-6xl gap-3 px-4 py-4 md:grid-cols-[auto_1fr_auto] md:items-center">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            aria-label="Grace home"
            className={`text-4xl font-black italic leading-none tracking-tight transition-colors ${
              dark ? "text-white hover:text-teal-100" : "text-primary-600 hover:text-primary-700"
            }`}
          >
            <span>Grac</span>
            <span className={dark ? "text-primary-300" : "text-primary-500"}>e</span>
          </Link>
        </div>

        <form onSubmit={onSearchSubmit} className="relative w-full">
          <label htmlFor="shop-nav-search" className="sr-only">
            {t("searchProductsLabel")}
          </label>
          <input
            id="shop-nav-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setSuggestOpen(suggestions.length > 0)}
            onBlur={() => {
              window.setTimeout(() => setSuggestOpen(false), 120);
            }}
            placeholder={t("searchPlaceholderNav")}
            className="w-full rounded-full border border-transparent bg-white px-4 py-2.5 text-sm text-slate-900 shadow-sm focus:border-primary-300 focus:outline-none focus:ring-2 focus:ring-primary-400/40"
          />
          {suggestOpen && (
            <ul className="absolute z-50 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              {suggestions.map((item) => {
                const catLabel = suggestionCategoryLabel(item, locale);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        const label = productDisplayName(
                          { name: item.name, nameAm: item.nameAm },
                          locale
                        );
                        setSearch(label);
                        setSuggestOpen(false);
                        router.push(`/catalog/${item.id}`);
                      }}
                      className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left hover:bg-primary-50"
                    >
                      <span className="truncate text-sm text-slate-900">
                        {productDisplayName({ name: item.name, nameAm: item.nameAm }, locale)}
                      </span>
                      {catLabel ? (
                        <span className="shrink-0 text-xs text-slate-500">{catLabel}</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </form>

        <Link
          href="/cart"
          className={`relative inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
            dark ? "text-emerald-50 hover:bg-primary-600 hover:text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {t("navCart")}
          {totalItems > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
              {totalItems}
            </span>
          )}
        </Link>
      </div>

      <div className={dark ? "border-t border-primary-600/80 bg-primary-700" : "border-t border-slate-200 bg-white"}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 py-2 text-sm font-medium">
          <Link
            href="/"
            className={`rounded-lg px-3 py-1.5 transition-colors ${
              dark
                ? current === "home"
                  ? "bg-primary-600 text-white"
                  : "text-emerald-100 hover:bg-primary-600/70 hover:text-white"
                : current === "home"
                  ? "bg-primary-50 text-primary-700"
                  : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {t("navHome")}
          </Link>
          {categories.map((c) => {
            const pathSlug = categoryPathSlug(c.name, c.slug);
            return (
              <Link
                key={c.id}
                href={`/catalog/category/${encodeURIComponent(pathSlug)}`}
                className={`rounded-lg px-3 py-1.5 transition-colors ${
                  dark ? "text-emerald-100 hover:bg-primary-600/70 hover:text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {categoryDisplayName(
                  { name: c.name, nameAm: c.nameAm },
                  locale
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
