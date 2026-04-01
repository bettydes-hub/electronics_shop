"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { ShopNav } from "@/components/catalog/ShopNav";
import { FirstSetupBanner } from "@/components/staff/FirstSetupBanner";
import { categoryPathSlug } from "@/lib/slug";

type CategoryRow = {
  id: string;
  name: string;
  slug: string | null;
};

export default function CategoryCatalogPage({ params }: { params: { slug: string } }) {
  const slugParam = decodeURIComponent(params.slug);
  const [resolvedName, setResolvedName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data: CategoryRow[]) => {
        if (cancelled || !Array.isArray(data)) return;
        const norm = slugParam.toLowerCase();
        const cat = data.find((c) => categoryPathSlug(c.name, c.slug).toLowerCase() === norm);
        setResolvedName(cat?.name ?? null);
      })
      .catch(() => {
        if (!cancelled) setResolvedName(null);
      });
    return () => {
      cancelled = true;
    };
  }, [slugParam]);

  const title = useMemo(() => {
    if (resolvedName) return resolvedName;
    return slugParam.replace(/-/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
  }, [resolvedName, slugParam]);

  return (
    <div className="flex flex-1 flex-col">
      <ShopNav current="catalog" />

      <div className="mx-auto w-full max-w-6xl px-4 pt-4">
        <FirstSetupBanner variant="light" />
        <nav className="mb-4 text-sm text-slate-600">
          <Link href="/" className="text-primary-600 hover:underline">
            Home
          </Link>
          <span className="mx-2 text-slate-400">/</span>
          <Link href="/catalog" className="text-primary-600 hover:underline">
            All products
          </Link>
          <span className="mx-2 text-slate-400">/</span>
          <span className="text-slate-900">{title}</span>
        </nav>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-8">
        <ProductGrid title={`${title}`} categorySlug={slugParam} />
      </main>
    </div>
  );
}
