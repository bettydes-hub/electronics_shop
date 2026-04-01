"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatMoney } from "@/lib/format-money";

export type CatalogProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  imageUrl: string | null;
  imageUrls?: string[];
  stock: number;
};

function productMatchesQuery(p: CatalogProduct, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const hay = [p.name, p.description ?? "", p.category ?? ""].join(" ").toLowerCase();
  return hay.includes(needle);
}

type Suggestion = { kind: "product" | "category"; value: string };

const SUGGESTION_LIMIT = 10;

/** Typeahead: product names first (starts-with, then contains), then matching categories. */
function buildSearchSuggestions(products: CatalogProduct[], q: string): Suggestion[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];

  const nameStarts: string[] = [];
  const nameContains: string[] = [];
  const seenNames = new Set<string>();

  for (const p of products) {
    const n = p.name;
    const ln = n.toLowerCase();
    if (!ln.includes(needle) || seenNames.has(n)) continue;
    seenNames.add(n);
    if (ln.startsWith(needle)) nameStarts.push(n);
    else nameContains.push(n);
  }
  nameStarts.sort((a, b) => a.localeCompare(b));
  nameContains.sort((a, b) => a.localeCompare(b));

  const out: Suggestion[] = [];
  for (const n of [...nameStarts, ...nameContains]) {
    out.push({ kind: "product", value: n });
    if (out.length >= SUGGESTION_LIMIT) return out;
  }

  const catSeen = new Set<string>();
  const categories: { c: string; starts: boolean }[] = [];
  for (const p of products) {
    const raw = p.category?.trim();
    if (!raw) continue;
    const lc = raw.toLowerCase();
    if (!lc.includes(needle) || catSeen.has(lc)) continue;
    catSeen.add(lc);
    categories.push({ c: raw, starts: lc.startsWith(needle) });
  }
  categories.sort((a, b) => {
    if (a.starts !== b.starts) return a.starts ? -1 : 1;
    return a.c.localeCompare(b.c);
  });

  for (const { c } of categories) {
    if (out.length >= SUGGESTION_LIMIT) break;
    out.push({ kind: "category", value: c });
  }

  return out;
}

function MatchHighlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <strong className="font-semibold text-slate-900">{text.slice(i, i + q.length)}</strong>
      {text.slice(i + q.length)}
    </>
  );
}

function ProductCard({
  product: p,
  images,
  addItem,
}: {
  product: CatalogProduct;
  images: string[];
  addItem: (item: { productId: string; name: string; price: number; imageUrl: string | null }) => void;
}) {
  const [imgIndex, setImgIndex] = useState(0);
  const mainImg = images[imgIndex] ?? images[0];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/catalog/${p.id}`} className="block">
        <div className="relative aspect-square bg-slate-100">
          {mainImg ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mainImg} alt={p.name} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-4xl text-slate-300">—</div>
          )}
          {images.length > 1 && (
            <div
              className="absolute bottom-2 left-0 right-0 flex justify-center gap-1"
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
                  className={`h-2 w-2 rounded-full ${i === imgIndex ? "bg-white" : "bg-white/50"}`}
                  aria-label={`Image ${i + 1}`}
                />
              ))}
            </div>
          )}
          {p.stock <= 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-900/50">
              <span className="rounded bg-slate-800 px-3 py-1 font-medium text-white">Out of Stock</span>
            </div>
          )}
        </div>
        <div className="p-4 pb-2">
          {p.category && (
            <span className="text-xs font-medium uppercase tracking-wide text-primary-600">{p.category}</span>
          )}
          <h2 className="mt-1 font-semibold text-slate-900">{p.name}</h2>
          {p.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{p.description}</p>}
          <p className="mt-2 text-lg font-bold text-primary-600">{formatMoney(p.price)}</p>
          <p className="mt-1 text-xs text-primary-600 hover:underline">View details &amp; reviews →</p>
        </div>
      </Link>
      <div className="flex items-center justify-between px-4 pb-4">
        <p className="text-xs text-slate-500">{p.stock} in stock</p>
        <button
          type="button"
          onClick={() => addItem({ productId: p.id, name: p.name, price: p.price, imageUrl: images[0] ?? null })}
          disabled={p.stock <= 0}
          className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}

type ProductGridProps = {
  title?: string;
  className?: string;
  /** Show search box (name, description, category). Default true. */
  showSearch?: boolean;
};

export function ProductGrid({ title = "Products", className = "", showSearch = true }: ProductGridProps) {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = "product-search-suggestions";
  const { addItem } = useCart();

  useEffect(() => {
    fetch("/api/products")
      .then((res) => res.json())
      .then((data) => {
        setProducts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => {
        setProducts([]);
        setLoading(false);
      });
  }, []);

  const suggestions = useMemo(() => buildSearchSuggestions(products, search), [products, search]);

  useEffect(() => {
    setActiveSuggestion(0);
  }, [search, suggestions.length]);

  const filtered = useMemo(
    () => products.filter((p) => productMatchesQuery(p, search)),
    [products, search]
  );

  const showSuggestList =
    suggestOpen && search.trim().length > 0 && suggestions.length > 0 && !loading;

  function applySuggestion(s: Suggestion) {
    setSearch(s.value);
    setSuggestOpen(false);
    inputRef.current?.focus();
  }

  return (
    <section className={className}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        {showSearch && !loading && products.length > 0 && (
          <div className="relative w-full sm:max-w-md">
            <label htmlFor="product-search" className="mb-1 block text-sm font-medium text-slate-600">
              Search
            </label>
            <input
              ref={inputRef}
              id="product-search"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setSuggestOpen(true);
              }}
              onFocus={() => setSuggestOpen(true)}
              onBlur={() => {
                window.setTimeout(() => setSuggestOpen(false), 120);
              }}
              placeholder="Product name or category…"
              autoComplete="off"
              role="combobox"
              aria-expanded={showSuggestList}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={
                showSuggestList ? `${listId}-option-${activeSuggestion}` : undefined
              }
              onKeyDown={(e) => {
                if (!showSuggestList) {
                  if (e.key === "Escape") setSuggestOpen(false);
                  return;
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActiveSuggestion((i) => Math.min(i + 1, suggestions.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActiveSuggestion((i) => Math.max(i - 1, 0));
                } else if (e.key === "Enter") {
                  e.preventDefault();
                  const s = suggestions[activeSuggestion];
                  if (s) applySuggestion(s);
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setSuggestOpen(false);
                }
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            {showSuggestList && (
              <ul
                id={listId}
                role="listbox"
                className="absolute z-50 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              >
                {suggestions.map((s, idx) => (
                  <li key={`${s.kind}-${s.value}-${idx}`} role="option" aria-selected={idx === activeSuggestion}>
                    <button
                      type="button"
                      id={`${listId}-option-${idx}`}
                      onMouseDown={(ev) => ev.preventDefault()}
                      onMouseEnter={() => setActiveSuggestion(idx)}
                      onClick={() => applySuggestion(s)}
                      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                        idx === activeSuggestion ? "bg-primary-50 text-slate-900" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="shrink-0 text-xs text-slate-400">
                        {s.kind === "product" ? "Product" : "Category"}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        <MatchHighlight text={s.kind === "category" ? s.value : s.value} query={search} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
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
          <p className="text-slate-500">No products yet. Check back soon!</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-slate-600">No products match &ldquo;{search.trim()}&rdquo;.</p>
          <button
            type="button"
            onClick={() => setSearch("")}
            className="mt-3 text-sm font-medium text-primary-600 hover:underline"
          >
            Clear search
          </button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => {
            const imgs =
              p.imageUrls && p.imageUrls.length > 0 ? p.imageUrls : p.imageUrl ? [p.imageUrl] : [];
            return <ProductCard key={p.id} product={p} images={imgs} addItem={addItem} />;
          })}
        </div>
      )}
    </section>
  );
}
