"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { FirstSetupBanner } from "@/components/staff/FirstSetupBanner";

export default function CatalogPage() {
  const { totalItems } = useCart();

  return (
    <div className="flex flex-1 flex-col">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-1">
            <Link href="/catalog" className="text-xl font-bold text-primary-600">
              Electronics Shop
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/cart"
              className="relative inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium text-slate-600 hover:bg-slate-100"
            >
              Cart
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs font-bold text-white">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      <div className="mx-auto w-full max-w-6xl px-4 pt-4">
        <FirstSetupBanner variant="light" />
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <ProductGrid title="Product catalog" />
      </main>
    </div>
  );
}
