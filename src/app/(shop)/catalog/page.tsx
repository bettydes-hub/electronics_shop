"use client";

import Link from "next/link";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { ShopNav } from "@/components/catalog/ShopNav";
import { FirstSetupBanner } from "@/components/staff/FirstSetupBanner";

export default function CatalogPage() {
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
          <span className="text-slate-900">All products</span>
        </nav>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-8">
        <ProductGrid title="Product catalog" />
      </main>
    </div>
  );
}
