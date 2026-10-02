"use client";

import { ProductGrid } from "@/components/catalog/ProductGrid";
import { ShopNav } from "@/components/catalog/ShopNav";
import { FirstSetupBanner } from "@/components/staff/FirstSetupBanner";

export default function CatalogPage() {
  return (
    <div className="flex flex-1 flex-col bg-amazon-bg">
      <ShopNav current="catalog" theme="dark" />

      <div className="w-full px-2 pt-3 sm:px-3 lg:px-4">
        <FirstSetupBanner variant="light" />
      </div>

      <main className="w-full flex-1 px-2 pb-8 sm:px-3 lg:px-4">
        <ProductGrid />
      </main>
    </div>
  );
}
