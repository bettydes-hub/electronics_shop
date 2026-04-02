"use client";

import { ProductGrid } from "@/components/catalog/ProductGrid";
import { ShopNav } from "@/components/catalog/ShopNav";
import { FirstSetupBanner } from "@/components/staff/FirstSetupBanner";

export default function CatalogPage() {
  return (
    <div className="flex flex-1 flex-col">
      <ShopNav current="catalog" />

      <div className="mx-auto w-full max-w-6xl px-4 pt-4">
        <FirstSetupBanner variant="light" />
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-8">
        <ProductGrid />
      </main>
    </div>
  );
}
