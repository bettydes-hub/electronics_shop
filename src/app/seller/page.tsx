"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PageBack } from "@/components/ui/PageBack";
import { StaffNavSession } from "@/components/staff/StaffNavSession";
import { StaffDashboardGateFallback, useStaffDashboardGate } from "@/lib/staff-dashboard-gate";
import { formatMoney, formatMoneyAmount } from "@/lib/format-money";

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
};

type Sale = {
  id: string;
  quantity: number;
  unitPrice: number;
  total: number;
  product: { id: string; name: string };
  createdAt: string;
};

function priceInputFromNumber(n: number): string {
  if (!Number.isFinite(n)) return "";
  if (n === Math.floor(n)) return String(n);
  return n.toFixed(2);
}

export default function SellerPage() {
  const gate = useStaffDashboardGate("seller");
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [searchText, setSearchText] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [saleUnitPrice, setSaleUnitPrice] = useState("");
  const [listOpen, setListOpen] = useState(false);
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const [editingOriginalProductId, setEditingOriginalProductId] = useState<string | null>(null);
  const [editingOriginalQuantity, setEditingOriginalQuantity] = useState(0);

  const comboboxRef = useRef<HTMLDivElement>(null);

  const fetchAll = async () => {
    const [pRes, sRes] = await Promise.all([
      fetch("/api/products"),
      fetch("/api/sales?period=all"),
    ]);
    setProducts(await pRes.json());
    const salesData = await sRes.json();
    setSales(salesData.slice(0, 20)); // Recent 20
    setLoading(false);
  };

  useEffect(() => {
    if (gate !== "ok") return;
    fetchAll();
  }, [gate]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target as Node)) {
        setListOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId]
  );

  const maxQtyForLine = useMemo(() => {
    if (!selectedProduct) return 0;
    if (
      editingSaleId &&
      editingOriginalProductId &&
      selectedProductId === editingOriginalProductId
    ) {
      return selectedProduct.stock + editingOriginalQuantity;
    }
    return selectedProduct.stock;
  }, [
    selectedProduct,
    editingSaleId,
    editingOriginalProductId,
    selectedProductId,
    editingOriginalQuantity,
  ]);

  const resetSaleForm = () => {
    setEditingSaleId(null);
    setEditingOriginalProductId(null);
    setEditingOriginalQuantity(0);
    setSelectedProductId("");
    setSearchText("");
    setSaleUnitPrice("");
    setQuantity("1");
    setListOpen(false);
  };

  const startEditSale = (s: Sale) => {
    setEditingSaleId(s.id);
    setEditingOriginalProductId(s.product.id);
    setEditingOriginalQuantity(s.quantity);
    setSelectedProductId(s.product.id);
    setSearchText(s.product.name);
    setSaleUnitPrice(priceInputFromNumber(s.unitPrice));
    setQuantity(String(s.quantity));
    setListOpen(false);
  };

  const suggestedProducts = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const sorted = [...products].sort((a, b) => a.name.localeCompare(b.name));
    if (!q) {
      return sorted.slice(0, 15);
    }
    return sorted.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 20);
  }, [products, searchText]);

  const pickProduct = (p: Product, keepQuantity = false) => {
    setSelectedProductId(p.id);
    setSearchText(p.name);
    setSaleUnitPrice(priceInputFromNumber(p.price));
    if (!keepQuantity) setQuantity("1");
    setListOpen(false);
  };

  const onSearchChange = (value: string) => {
    setSearchText(value);
    setListOpen(true);
    const sel = selectedProductId ? products.find((x) => x.id === selectedProductId) : null;
    if (!sel || sel.name !== value) {
      setSelectedProductId("");
      setSaleUnitPrice("");
    }
  };

  const handleSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !quantity) {
      alert("Choose a product from the suggestions.");
      return;
    }
    const product = products.find((p) => p.id === selectedProductId);
    if (!product) return;
    const qty = parseInt(quantity, 10);
    if (Number.isNaN(qty) || qty < 1) {
      alert("Quantity must be at least 1");
      return;
    }
    const unitRaw = saleUnitPrice.trim() === "" ? product.price : parseFloat(saleUnitPrice);
    if (Number.isNaN(unitRaw) || unitRaw < 0) {
      alert("Sale price must be a number (0 or more).");
      return;
    }

    if (qty > maxQtyForLine) {
      alert(
        `Quantity cannot exceed ${maxQtyForLine} for this product (available stock for this sale).`
      );
      return;
    }

    const res = editingSaleId
      ? await fetch(`/api/sales/${editingSaleId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: selectedProductId,
            quantity: qty,
            unitPrice: unitRaw,
          }),
        })
      : await fetch("/api/sales", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: selectedProductId,
            quantity: qty,
            unitPrice: unitRaw,
          }),
        });
    const data = await res.json();
    if (data.error) {
      alert(data.error);
      return;
    }
    resetSaleForm();
    fetchAll();
  };

  const qtyNum = parseInt(quantity || "0", 10);
  const unitNum =
    saleUnitPrice.trim() === ""
      ? selectedProduct?.price ?? 0
      : parseFloat(saleUnitPrice);
  const lineOk = selectedProduct && Number.isFinite(unitNum) && unitNum >= 0 && qtyNum >= 1;

  if (gate !== "ok") {
    return <StaffDashboardGateFallback />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-2">
            <PageBack href="/catalog" ariaLabel="Back to store" />
            <Link href="/catalog" className="text-xl font-bold text-primary-600">
              Electronics Shop
            </Link>
          </div>
          <StaffNavSession />
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Seller - Record Sales</h1>

        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
              {editingSaleId ? "Correct sale" : "Record Sale"}
            </h2>
            {editingSaleId && (
              <div className="mb-4 flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  You are fixing a sale already recorded. Update product, price, or quantity, then
                  save — stock is adjusted automatically.
                </span>
                <button
                  type="button"
                  onClick={resetSaleForm}
                  className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1.5 font-medium text-amber-900 hover:bg-amber-100"
                >
                  Cancel edit
                </button>
              </div>
            )}
            <form onSubmit={handleSale} className="space-y-4">
              <div ref={comboboxRef} className="relative">
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="product-search">
                  Product
                </label>
                <input
                  id="product-search"
                  type="text"
                  autoComplete="off"
                  placeholder="Type name to search…"
                  value={searchText}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onFocus={() => setListOpen(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setListOpen(false);
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  aria-autocomplete="list"
                  aria-expanded={listOpen}
                  aria-controls="product-suggestions"
                />
                {listOpen && suggestedProducts.length > 0 && (
                  <ul
                    id="product-suggestions"
                    role="listbox"
                    className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                  >
                    {suggestedProducts.map((p) => (
                      <li key={p.id} role="option" aria-selected={p.id === selectedProductId}>
                        <button
                          type="button"
                          className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-slate-50"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => pickProduct(p, Boolean(editingSaleId))}
                        >
                          <span className="font-medium text-slate-900">{p.name}</span>
                          <span className="text-xs text-slate-600">
                            List {formatMoney(p.price)} · Stock {p.stock}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {listOpen && searchText.trim() && suggestedProducts.length === 0 && (
                  <p className="absolute z-20 mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow">
                    No products match “{searchText.trim()}”.
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-500">
                  Pick from the list. You can set the actual sale price below (discount or markup).
                </p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="sale-unit-price">
                  Sale price (per unit)
                </label>
                <input
                  id="sale-unit-price"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="any"
                  disabled={!selectedProductId}
                  placeholder={selectedProduct ? `List: ${formatMoneyAmount(selectedProduct.price)}` : "Select a product first"}
                  value={saleUnitPrice}
                  onChange={(e) => setSaleUnitPrice(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                />
                {selectedProduct && (
                  <p className="mt-1 text-xs text-slate-500">
                    Catalog price: {formatMoney(selectedProduct.price)} — enter a lower or higher amount
                    if needed.
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  disabled={!selectedProductId}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 disabled:bg-slate-100"
                />
                {selectedProduct && (
                  <p className="mt-1 text-sm text-slate-500">
                    {editingSaleId
                      ? `Max quantity for this line: ${maxQtyForLine}`
                      : `Stock available: ${selectedProduct.stock}`}
                    {lineOk && (
                      <>
                        {" "}
                        · Line total:{" "}
                        <span className="font-medium text-slate-800">
                          {formatMoney((Number.isFinite(unitNum) ? unitNum : 0) * qtyNum)}
                        </span>
                      </>
                    )}
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={!selectedProductId}
                className="w-full rounded-lg bg-primary-600 py-2 font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {editingSaleId ? "Save changes" : "Record Sale"}
              </button>
            </form>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <h2 className="border-b border-slate-200 px-6 py-4 text-lg font-semibold">
              Inventory
            </h2>
            {loading ? (
              <div className="p-6 text-center text-slate-500">Loading...</div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {products.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">No products</div>
                ) : (
                  products.map((p) => (
                    <div
                      key={p.id}
                      className="flex justify-between border-b border-slate-100 px-6 py-3 last:border-0"
                    >
                      <span className="font-medium">{p.name}</span>
                      <span
                        className={
                          p.stock <= 0
                            ? "font-medium text-red-600"
                            : p.stock < 5
                              ? "font-medium text-amber-600"
                              : "text-slate-600"
                        }
                      >
                        {p.stock} in stock
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <h2 className="border-b border-slate-200 px-6 py-4 text-lg font-semibold">
            Recent Sales
          </h2>
          {sales.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No sales yet</div>
          ) : (
            <div className="divide-y divide-slate-200">
              {sales.map((s) => {
                return (
                  <div
                    key={s.id}
                    className="flex flex-col gap-3 px-6 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <span className="font-medium text-slate-900">{s.product.name}</span>
                      <p className="text-sm text-slate-600">
                        {formatMoney(s.unitPrice)} × {s.quantity} = {formatMoney(s.total)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                      <span className="font-medium text-green-600">{formatMoney(s.total)}</span>
                      <button
                        type="button"
                        onClick={() => startEditSale(s)}
                        className="rounded-lg border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
