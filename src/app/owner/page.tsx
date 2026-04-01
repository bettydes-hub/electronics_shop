"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { PageBack } from "@/components/ui/PageBack";
import { StaffNavSession } from "@/components/staff/StaffNavSession";
import { StaffDashboardGateFallback, useStaffDashboardGate } from "@/lib/staff-dashboard-gate";
import { readStaffSession } from "@/lib/staff-session";
import { formatMoney, formatMoneyAmount, formatMoneySigned } from "@/lib/format-money";
import {
  DEFAULT_PRODUCT_IMAGE_MAX,
  DEFAULT_PRODUCT_IMAGE_MIN,
} from "@/lib/product-image-policy";
import type { SalesPeriodFilter } from "@/lib/sales-period";

type Dashboard = {
  totalCost: number;
  totalRevenue: number;
  profit: number;
  purchaseTotal: number;
  expenseTotal: number;
  salesTotal: number;
};

type PeriodSummary = {
  profit: number;
  totalRevenue: number;
  totalCost: number;
  purchaseTotal: number;
  expenseTotal: number;
  salesTotal: number;
  label: string;
};

type FloorSale = {
  id: string;
  quantity: number;
  unitPrice: number;
  total: number;
  createdAt: string;
  product: {
    name: string;
    imageUrl: string | null;
    imageUrls?: string[];
    category?: string | null;
  };
};

type Purchase = {
  id: string;
  productId: string;
  quantity: number;
  unitCost: number;
  unitSalePrice?: number | null;
  totalCost: number;
  notes: string | null;
  product: { name: string };
};

type Expense = {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  period?: string;
  createdAt: string;
};

type OwnerProduct = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  costPrice: number | null;
  category: string | null;
  categoryId: string | null;
  imageUrl: string | null;
  imageUrls?: string[];
  stock: number;
};

type Category = {
  id: string;
  name: string;
  slug: string | null;
};

function ownerStaffHeaders(): Record<string, string> {
  const { id } = readStaffSession();
  return id ? { "x-user-id": id } : {};
}

const PERIOD_LABELS: Record<string, string> = {
  WEEKLY: "Week",
  MONTHLY: "Month",
  THREE_MONTHS: "3 months",
  SIX_MONTHS: "6 months",
  YEARLY: "Year",
};

type ExpenseCoverPeriod = "MONTHLY" | "THREE_MONTHS" | "SIX_MONTHS" | "YEARLY";

function groupFloorSalesByCategory(sales: FloorSale[]) {
  const map = new Map<string, FloorSale[]>();
  for (const s of sales) {
    const cat = s.product.category?.trim() || "Uncategorized";
    if (!map.has(cat)) map.set(cat, []);
    map.get(cat)!.push(s);
  }
  return Array.from(map.entries())
    .map(([key, items]) => {
      const sorted = [...items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      return {
        key,
        label: key,
        items: sorted,
        subtotal: sorted.reduce((sum, x) => sum + x.total, 0),
      };
    })
    .sort((a, b) => a.key.localeCompare(b.key));
}

function localDayKey(iso: string): string {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function groupFloorSalesByDay(sales: FloorSale[]) {
  const map = new Map<string, FloorSale[]>();
  for (const s of sales) {
    const key = localDayKey(s.createdAt);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return Array.from(map.entries())
    .map(([key, items]) => {
      const sorted = [...items].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const label = new Date(
        `${key}T12:00:00`
      ).toLocaleDateString(undefined, {
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
      });
      return {
        key,
        label,
        items: sorted,
        subtotal: sorted.reduce((sum, x) => sum + x.total, 0),
      };
    })
    .sort((a, b) => b.key.localeCompare(a.key));
}

export default function OwnerPage() {
  const gate = useStaffDashboardGate("owner");
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [periods, setPeriods] = useState<{
    month: PeriodSummary;
    threeMonths: PeriodSummary;
    sixMonths: PeriodSummary;
    year: PeriodSummary;
  } | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [floorSales, setFloorSales] = useState<FloorSale[]>([]);
  const [salesPeriod, setSalesPeriod] = useState<SalesPeriodFilter>("all");
  const [allSalesGroupBy, setAllSalesGroupBy] = useState<"category" | "day">("day");
  const [salesLoading, setSalesLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "overview" | "products" | "purchases" | "expenses" | "sales"
  >("overview");
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [allProducts, setAllProducts] = useState<OwnerProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    costPrice: "",
    categoryId: "",
    imageUrls: [] as string[],
    stock: "",
  });
  const [productUploading, setProductUploading] = useState(false);
  const [productMsg, setProductMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [ownerCatForm, setOwnerCatForm] = useState({ name: "", slug: "" });
  const [categoryMsg, setCategoryMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [imageLimits, setImageLimits] = useState({
    min: DEFAULT_PRODUCT_IMAGE_MIN,
    max: DEFAULT_PRODUCT_IMAGE_MAX,
  });

  const [purchaseForm, setPurchaseForm] = useState({
    productId: "",
    quantity: "",
    unitCost: "",
    unitSalePrice: "",
    notes: "",
  });
  const [expenseForm, setExpenseForm] = useState<{
    description: string;
    amount: string;
    category: string;
    period: ExpenseCoverPeriod;
  }>({
    description: "",
    amount: "",
    category: "",
    period: "MONTHLY",
  });

  const fetchAll = async () => {
    const [dRes, perRes, purRes, eRes, prodRes, catRes, settingsRes] = await Promise.all([
      fetch("/api/dashboard"),
      fetch("/api/dashboard/periods"),
      fetch("/api/purchases"),
      fetch("/api/expenses"),
      fetch("/api/products"),
      fetch("/api/categories"),
      fetch("/api/shop-settings"),
    ]);
    setDashboard(await dRes.json());
    const perData = await perRes.json();
    if (
      !perData.error &&
      perData.month &&
      perData.threeMonths &&
      perData.sixMonths &&
      perData.year
    ) {
      setPeriods({
        month: perData.month,
        threeMonths: perData.threeMonths,
        sixMonths: perData.sixMonths,
        year: perData.year,
      });
    }
    setPurchases(await purRes.json());
    setExpenses(await eRes.json());
    const prods = await prodRes.json();
    setAllProducts(Array.isArray(prods) ? prods : []);
    const cats = await catRes.json();
    setCategories(Array.isArray(cats) ? cats : []);
    try {
      const settings = await settingsRes.json();
      if (
        !settings?.error &&
        typeof settings.productImageCountMin === "number" &&
        typeof settings.productImageCountMax === "number"
      ) {
        setImageLimits({
          min: settings.productImageCountMin,
          max: settings.productImageCountMax,
        });
      }
    } catch {
      /* keep defaults */
    }
    setLoading(false);
  };

  const showProductToast = (type: "success" | "error", text: string) => {
    setProductMsg({ type, text });
    setTimeout(() => setProductMsg(null), 4000);
  };

  const showCategoryToast = (type: "success" | "error", text: string) => {
    setCategoryMsg({ type, text });
    setTimeout(() => setCategoryMsg(null), 4000);
  };

  const handleOwnerCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const session = readStaffSession();
    if (!session.id) {
      showCategoryToast("error", "Sign in required.");
      return;
    }
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...ownerStaffHeaders() },
        body: JSON.stringify({
          name: ownerCatForm.name.trim(),
          slug: ownerCatForm.slug.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed");
      showCategoryToast("success", "Category added");
      setOwnerCatForm({ name: "", slug: "" });
      fetchAll();
    } catch (err) {
      showCategoryToast("error", err instanceof Error ? err.message : "Failed to create category");
    }
  };

  const salesPeriodTotal = useMemo(
    () => floorSales.reduce((sum, s) => sum + s.total, 0),
    [floorSales]
  );

  const salesGroupedForAll = useMemo(() => {
    if (salesPeriod !== "all") return null;
    if (allSalesGroupBy === "category") {
      return { mode: "category" as const, groups: groupFloorSalesByCategory(floorSales) };
    }
    return { mode: "day" as const, groups: groupFloorSalesByDay(floorSales) };
  }, [salesPeriod, allSalesGroupBy, floorSales]);

  const compressAndGetDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement("img");
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const canvas = document.createElement("canvas");
        const maxSize = 800;
        let { width, height } = img;
        if (width > maxSize || height > maxSize) {
          if (width > height) {
            height = (height * maxSize) / width;
            width = maxSize;
          } else {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return reject(new Error("Compress failed"));
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(new Error("Failed to read"));
            reader.readAsDataURL(blob);
          },
          "image/jpeg",
          0.7
        );
      };
      img.onerror = () => reject(new Error("Invalid image"));
      img.src = url;
    });
  };

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

  const handleProductImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    const current = productForm.imageUrls?.length ?? 0;
    const remaining = imageLimits.max - current;
    const toAdd = files.slice(0, Math.max(0, remaining));
    if (toAdd.length === 0) {
      showProductToast("error", `Maximum ${imageLimits.max} images allowed`);
      return;
    }
    setProductUploading(true);
    const newUrls: string[] = [];
    for (const file of toAdd) {
      try {
        const dataUrl = file.type.startsWith("image/")
          ? await compressAndGetDataUrl(file)
          : await fileToDataUrl(file);
        newUrls.push(dataUrl);
      } catch (err) {
        showProductToast("error", err instanceof Error ? err.message : "Upload failed");
        break;
      }
    }
    setProductForm((f) => ({ ...f, imageUrls: [...(f.imageUrls || []), ...newUrls] }));
    setProductUploading(false);
    e.target.value = "";
  };

  const removeProductImage = (index: number) => {
    setProductForm((f) => ({
      ...f,
      imageUrls: (f.imageUrls || []).filter((_, i) => i !== index),
    }));
  };

  const resetOwnerProductForm = () => {
    setProductForm({
      name: "",
      description: "",
      price: "",
      costPrice: "",
      categoryId: "",
      imageUrls: [],
      stock: "",
    });
    setShowProductForm(false);
    setEditingProductId(null);
  };

  const handleOwnerProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const urls = productForm.imageUrls || [];
    if (urls.length < imageLimits.min || urls.length > imageLimits.max) {
      showProductToast(
        "error",
        `Product must have ${imageLimits.min} to ${imageLimits.max} images`
      );
      return;
    }
    const categoryValue = productForm.categoryId
      ? categories.find((c) => c.id === productForm.categoryId)?.name || null
      : null;
    const payload: Record<string, unknown> = {
      name: productForm.name,
      description: productForm.description || null,
      price: parseFloat(productForm.price) || 0,
      costPrice: productForm.costPrice ? parseFloat(productForm.costPrice) : null,
      category: categoryValue,
      stock: productForm.stock ? parseInt(productForm.stock, 10) : 0,
      imageUrls: urls,
    };
    try {
      if (editingProductId) {
        const res = await fetch(`/api/products/${editingProductId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        showProductToast("success", "Product updated");
      } else {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        showProductToast("success", "Product created");
      }
      resetOwnerProductForm();
      fetchAll();
    } catch (err) {
      showProductToast("error", err instanceof Error ? err.message : "Failed to save product");
    }
  };

  const handleEditOwnerProduct = (p: OwnerProduct) => {
    const matchingCat = p.category ? categories.find((c) => c.name === p.category) : null;
    const urls =
      p.imageUrls && p.imageUrls.length > 0 ? p.imageUrls : p.imageUrl ? [p.imageUrl] : [];
    setProductForm({
      name: p.name,
      description: p.description || "",
      price: String(p.price),
      costPrice: p.costPrice != null ? String(p.costPrice) : "",
      categoryId: matchingCat?.id || p.categoryId || "",
      imageUrls: urls,
      stock: String(p.stock),
    });
    setEditingProductId(p.id);
    setShowProductForm(true);
  };

  const handleDeleteOwnerProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await fetch(`/api/products/${id}`, { method: "DELETE" });
      showProductToast("success", "Product deleted");
      fetchAll();
    } catch {
      showProductToast("error", "Failed to delete");
    }
  };

  useEffect(() => {
    if (gate !== "ok") return;
    fetchAll();
  }, [gate]);

  useEffect(() => {
    if (gate !== "ok" || activeTab !== "sales") return;
    let cancelled = false;
    (async () => {
      setSalesLoading(true);
      try {
        const r = await fetch(`/api/sales?period=${encodeURIComponent(salesPeriod)}`);
        const data = await r.json();
        if (!cancelled) {
          setFloorSales(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) setFloorSales([]);
      } finally {
        if (!cancelled) setSalesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, salesPeriod, gate]);

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: purchaseForm.productId,
        quantity: purchaseForm.quantity,
        unitCost: purchaseForm.unitCost,
        unitSalePrice: purchaseForm.unitSalePrice.trim()
          ? parseFloat(purchaseForm.unitSalePrice)
          : undefined,
        notes: purchaseForm.notes || null,
      }),
    });
    setPurchaseForm({ productId: "", quantity: "", unitCost: "", unitSalePrice: "", notes: "" });
    setShowPurchaseForm(false);
    fetchAll();
  };

  const handleExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: expenseForm.description,
        amount: expenseForm.amount,
        category: expenseForm.category || null,
        period: expenseForm.period,
      }),
    });
    setExpenseForm({ description: "", amount: "", category: "", period: "MONTHLY" });
    setShowExpenseForm(false);
    fetchAll();
  };

  if (gate !== "ok") {
    return <StaffDashboardGateFallback />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-1">
            <PageBack href="/catalog" ariaLabel="Back to store" />
            <Link href="/catalog" className="text-xl font-bold text-primary-600">
              Electronics Shop
            </Link>
          </div>
          <StaffNavSession />
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-4 py-2 font-medium ${activeTab === "overview" ? "border-b-2 border-primary-600 text-primary-600" : "text-slate-600 hover:text-slate-900"}`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab("products")}
            className={`px-4 py-2 font-medium ${activeTab === "products" ? "border-b-2 border-primary-600 text-primary-600" : "text-slate-600 hover:text-slate-900"}`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveTab("purchases")}
            className={`px-4 py-2 font-medium ${activeTab === "purchases" ? "border-b-2 border-primary-600 text-primary-600" : "text-slate-600 hover:text-slate-900"}`}
          >
            Purchases
          </button>
          <button
            onClick={() => setActiveTab("expenses")}
            className={`px-4 py-2 font-medium ${activeTab === "expenses" ? "border-b-2 border-primary-600 text-primary-600" : "text-slate-600 hover:text-slate-900"}`}
          >
            Expenses
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sales")}
            className={`px-4 py-2 font-medium ${activeTab === "sales" ? "border-b-2 border-primary-600 text-primary-600" : "text-slate-600 hover:text-slate-900"}`}
          >
            Sales
          </button>
        </div>

        {loading ? (
          <div className="text-slate-500">Loading...</div>
        ) : (
          <>
            {activeTab === "overview" && dashboard && (
              <div className="space-y-8">
                {periods && (
                  <div>
                    <h2 className="mb-3 text-lg font-semibold text-slate-900">Profit by period</h2>
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      {(
                        [
                          ["month", periods.month, "This month"],
                          ["threeMonths", periods.threeMonths, "Last 3 months"],
                          ["sixMonths", periods.sixMonths, "Last 6 months"],
                          ["year", periods.year, "This year"],
                        ] as const
                      ).map(([key, p, title]) => (
                        <div
                          key={key}
                          className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                        >
                          <p className="text-sm font-medium text-slate-500">{title}</p>
                          <p className="mt-0.5 text-xs text-slate-400">{p.label}</p>
                          <p
                            className={`mt-3 text-2xl font-bold ${
                              p.profit >= 0 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {formatMoneySigned(p.profit)}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Revenue {formatMoney(p.totalRevenue)} · Costs {formatMoney(p.totalCost)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h2 className="mb-3 text-lg font-semibold text-slate-900">All time</h2>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Total Revenue</p>
                  <p className="mt-1 text-2xl font-bold text-green-600">
                    {formatMoney(dashboard.totalRevenue)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Total Cost</p>
                  <p className="mt-1 text-2xl font-bold text-red-600">
                    {formatMoney(dashboard.totalCost)}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Purchases: {formatMoney(dashboard.purchaseTotal)} + Expenses:{" "}
                    {formatMoney(dashboard.expenseTotal)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Profit</p>
                  <p
                    className={`mt-1 text-2xl font-bold ${dashboard.profit >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatMoney(dashboard.profit)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-medium text-slate-500">Revenue</p>
                  <p className="mt-1 text-sm text-slate-700">
                    Floor sales (seller): {formatMoney(dashboard.salesTotal)}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Recorded in{" "}
                    <Link href="/seller" className="font-medium text-primary-600 hover:underline">
                      Seller
                    </Link>
                    .
                  </p>
                </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "products" && (
              <div className="space-y-4">
                <form
                  onSubmit={handleOwnerCategorySubmit}
                  className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="mb-4 font-semibold">Add category</h3>
                  <p className="mb-4 text-sm text-slate-600">
                    New categories appear in the dropdown below when adding or editing products.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Name</label>
                      <input
                        type="text"
                        required
                        value={ownerCatForm.name}
                        onChange={(e) => setOwnerCatForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Phones"
                        className="rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Slug</label>
                      <input
                        type="text"
                        value={ownerCatForm.slug}
                        onChange={(e) => setOwnerCatForm((f) => ({ ...f, slug: e.target.value }))}
                        placeholder="e.g. phones (optional)"
                        className="rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        type="submit"
                        className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
                      >
                        Add category
                      </button>
                    </div>
                  </div>
                </form>
                {categoryMsg && (
                  <div
                    className={`rounded-lg px-4 py-2 text-sm ${
                      categoryMsg.type === "success"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                    role="status"
                  >
                    {categoryMsg.text}
                  </div>
                )}
                {!showProductForm ? (
                  <button
                    type="button"
                    onClick={() => {
                      resetOwnerProductForm();
                      setShowProductForm(true);
                    }}
                    className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
                  >
                    Add Product
                  </button>
                ) : (
                  <form
                    onSubmit={handleOwnerProductSubmit}
                    className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <h3 className="mb-4 font-semibold">{editingProductId ? "Edit" : "Add"} Product</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium">Name *</label>
                        <input
                          type="text"
                          required
                          value={productForm.name}
                          onChange={(e) => setProductForm((f) => ({ ...f, name: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Price (ETB) *</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={productForm.price}
                          onChange={(e) => setProductForm((f) => ({ ...f, price: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Updates the storefront and the price used on{" "}
                          <Link href="/seller" className="font-medium text-primary-600 hover:underline">
                            Seller
                          </Link>{" "}
                          for new sales. Existing floor-sale history stays at the amounts that were
                          recorded.
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-sm font-medium">Description</label>
                        <textarea
                          value={productForm.description}
                          onChange={(e) =>
                            setProductForm((f) => ({ ...f, description: e.target.value }))
                          }
                          rows={2}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Cost price (ETB)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={productForm.costPrice}
                          onChange={(e) =>
                            setProductForm((f) => ({ ...f, costPrice: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Stock</label>
                        <input
                          type="number"
                          value={productForm.stock}
                          onChange={(e) => setProductForm((f) => ({ ...f, stock: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Category</label>
                        <select
                          value={productForm.categoryId}
                          onChange={(e) =>
                            setProductForm((f) => ({ ...f, categoryId: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        >
                          <option value="">No category</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="mb-1 block text-sm font-medium">
                        Images ({imageLimits.min}–{imageLimits.max}) *
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(productForm.imageUrls || []).map((url, i) => (
                          <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeProductImage(i)}
                              className="absolute right-1 top-1 rounded bg-red-600 px-1.5 py-0.5 text-xs text-white"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {(productForm.imageUrls?.length ?? 0) < imageLimits.max && (
                          <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 hover:bg-slate-50">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={handleProductImageUpload}
                              disabled={productUploading}
                            />
                            <span className="text-slate-500">{productUploading ? "…" : "+"}</span>
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        type="submit"
                        className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
                      >
                        {editingProductId ? "Update" : "Add"} Product
                      </button>
                      <button
                        type="button"
                        onClick={resetOwnerProductForm}
                        className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
                {productMsg && (
                  <div
                    className={`rounded-lg px-4 py-2 text-sm ${
                      productMsg.type === "success"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                    role="status"
                  >
                    {productMsg.text}
                  </div>
                )}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  {allProducts.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No products yet.</div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {allProducts.map((p) => (
                        <div key={p.id} className="flex items-center gap-4 px-6 py-4">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            {p.imageUrls?.[0] ?? p.imageUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.imageUrls?.[0] ?? p.imageUrl ?? ""}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">
                                —
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{p.name}</p>
                            <p className="text-sm text-slate-500">
                              {formatMoney(p.price)} · Stock: {p.stock}
                              {p.category && ` · ${p.category}`}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditOwnerProduct(p)}
                              className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteOwnerProduct(p.id)}
                              className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "purchases" && (
              <div className="space-y-4">
                <button
                  onClick={() => setShowPurchaseForm(!showPurchaseForm)}
                  className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
                >
                  {showPurchaseForm ? "Cancel" : "Record Purchase"}
                </button>
                {showPurchaseForm && (
                  <form
                    onSubmit={handlePurchase}
                    className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Product</label>
                        <select
                          required
                          value={purchaseForm.productId}
                          onChange={(e) => {
                            const id = e.target.value;
                            const p = allProducts.find((x) => x.id === id);
                            setPurchaseForm((f) => ({
                              ...f,
                              productId: id,
                              unitSalePrice:
                                p !== undefined ? String(p.price) : f.unitSalePrice,
                            }));
                          }}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        >
                          <option value="">Select product</option>
                          {allProducts.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({formatMoney(p.price)})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Quantity</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={purchaseForm.quantity}
                          onChange={(e) =>
                            setPurchaseForm((f) => ({ ...f, quantity: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Unit cost in ETB (what you paid per unit)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={purchaseForm.unitCost}
                          onChange={(e) =>
                            setPurchaseForm((f) => ({ ...f, unitCost: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Sale price per unit (customer price)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={purchaseForm.unitSalePrice}
                          onChange={(e) =>
                            setPurchaseForm((f) => ({ ...f, unitSalePrice: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          Updates the product&apos;s catalog price. Pre-filled from current price when you pick a product.
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
                        <input
                          type="text"
                          value={purchaseForm.notes}
                          onChange={(e) =>
                            setPurchaseForm((f) => ({ ...f, notes: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="mt-4 rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
                    >
                      Record Purchase
                    </button>
                  </form>
                )}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-6 py-4 font-semibold">
                    Purchase History
                  </div>
                  <div className="divide-y divide-slate-200">
                    {purchases.length === 0 ? (
                      <div className="p-6 text-center text-slate-500">No purchases yet</div>
                    ) : (
                      purchases.map((p) => (
                        <div key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-6 py-4">
                          <div>
                            <span className="font-medium">{p.product.name}</span>
                            <span className="text-slate-600"> × {p.quantity}</span>
                            <p className="text-xs text-slate-500">
                              Cost {formatMoneyAmount(p.unitCost)} ETB/unit
                              {p.unitSalePrice != null && (
                                <> · Sale {formatMoneyAmount(p.unitSalePrice)} ETB/unit</>
                              )}
                            </p>
                          </div>
                          <span className="font-medium">{formatMoney(p.totalCost)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "expenses" && (
              <div className="space-y-4">
                <button
                  onClick={() => setShowExpenseForm(!showExpenseForm)}
                  className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
                >
                  {showExpenseForm ? "Cancel" : "Record Expense"}
                </button>
                {showExpenseForm && (
                  <form
                    onSubmit={handleExpense}
                    className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
                        <input
                          type="text"
                          required
                          value={expenseForm.description}
                          onChange={(e) =>
                            setExpenseForm((f) => ({ ...f, description: e.target.value }))
                          }
                          placeholder="e.g. Electricity bill"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Amount</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={expenseForm.amount}
                          onChange={(e) =>
                            setExpenseForm((f) => ({ ...f, amount: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
                        <input
                          type="text"
                          value={expenseForm.category}
                          onChange={(e) =>
                            setExpenseForm((f) => ({ ...f, category: e.target.value }))
                          }
                          placeholder="e.g. Utilities, Rent"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          Amount covers
                        </label>
                        <select
                          value={expenseForm.period}
                          onChange={(e) =>
                            setExpenseForm((f) => ({
                              ...f,
                              period: e.target.value as ExpenseCoverPeriod,
                            }))
                          }
                          className="w-full max-w-md rounded-lg border border-slate-300 px-3 py-2"
                        >
                          <option value="MONTHLY">One month</option>
                          <option value="THREE_MONTHS">3 months</option>
                          <option value="SIX_MONTHS">6 months</option>
                          <option value="YEARLY">One year</option>
                        </select>
                        <p className="mt-1 text-xs text-slate-500">
                          Label for what this payment covers.
                        </p>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="mt-4 rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
                    >
                      Record Expense
                    </button>
                  </form>
                )}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="border-b border-slate-200 px-6 py-4 font-semibold">
                    Expense History
                  </div>
                  <div className="divide-y divide-slate-200">
                    {expenses.length === 0 ? (
                      <div className="p-6 text-center text-slate-500">No expenses yet</div>
                    ) : (
                      expenses.map((e) => (
                        <div key={e.id} className="flex justify-between px-6 py-4">
                          <div>
                            <span className="font-medium">{e.description}</span>
                            {e.category && (
                              <span className="ml-2 text-sm text-slate-500">({e.category})</span>
                            )}
                            <span className="ml-2 rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                              {PERIOD_LABELS[e.period ?? "MONTHLY"] ?? e.period}
                            </span>
                          </div>
                          <span className="font-medium text-red-600">{formatMoney(e.amount)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "sales" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                      Period
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          ["all", "All sales"],
                          ["today", "Today"],
                          ["week", "This week"],
                          ["month", "This month"],
                          ["year", "This year"],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setSalesPeriod(value)}
                          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                            salesPeriod === value
                              ? "bg-primary-600 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {salesPeriod === "all" && (
                    <div>
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                        Organize all sales
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => setAllSalesGroupBy("day")}
                          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                            allSalesGroupBy === "day"
                              ? "bg-slate-800 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          By day
                        </button>
                        <button
                          type="button"
                          onClick={() => setAllSalesGroupBy("category")}
                          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                            allSalesGroupBy === "category"
                              ? "bg-slate-800 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          }`}
                        >
                          By category
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-1 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <span className="font-semibold">Floor sales</span>
                    {!salesLoading && floorSales.length > 0 && (
                      <span className="text-sm text-slate-600">
                        Subtotal:{" "}
                        <span className="font-semibold text-green-700">
                          {formatMoney(salesPeriodTotal)}
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="divide-y divide-slate-200">
                    {salesLoading ? (
                      <div className="p-6 text-center text-slate-500">Loading sales…</div>
                    ) : floorSales.length === 0 ? (
                      <div className="p-6 text-center text-slate-500">
                        No sales in this period.
                      </div>
                    ) : salesGroupedForAll ? (
                      salesGroupedForAll.groups.map((g) => (
                        <div key={g.key}>
                          <div className="flex flex-wrap items-baseline justify-between gap-2 bg-slate-50 px-6 py-3">
                            <span className="font-medium text-slate-800">{g.label}</span>
                            <span className="text-sm text-green-700">
                              {formatMoney(g.subtotal)}
                            </span>
                          </div>
                          <div className="divide-y divide-slate-100">
                            {g.items.map((s) => {
                              const thumb =
                                (s.product.imageUrls?.length ?? 0) > 0
                                  ? s.product.imageUrls![0]
                                  : s.product.imageUrl;
                              return (
                                <div
                                  key={s.id}
                                  className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                                >
                                  <div className="flex min-w-0 flex-1 gap-3">
                                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                                      {thumb ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                          src={thumb}
                                          alt=""
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-full items-center justify-center text-xs text-slate-400">
                                          —
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-medium text-slate-900">
                                        {s.product.name}
                                      </p>
                                      <p className="text-sm text-slate-600">
                                        {formatMoney(s.unitPrice)} × {s.quantity} ={" "}
                                        {formatMoney(s.total)}
                                      </p>
                                      <p className="text-xs text-slate-400">
                                        {new Date(s.createdAt).toLocaleString()}
                                      </p>
                                    </div>
                                  </div>
                                  <p className="shrink-0 text-lg font-semibold text-green-700 sm:text-right">
                                    {formatMoney(s.total)}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    ) : (
                      floorSales.map((s) => {
                        const thumb =
                          (s.product.imageUrls?.length ?? 0) > 0
                            ? s.product.imageUrls![0]
                            : s.product.imageUrl;
                        return (
                          <div
                            key={s.id}
                            className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="flex min-w-0 flex-1 gap-3">
                              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                                {thumb ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={thumb}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-xs text-slate-400">
                                    —
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900">{s.product.name}</p>
                                {s.product.category ? (
                                  <p className="text-xs text-slate-500">{s.product.category}</p>
                                ) : null}
                                <p className="text-sm text-slate-600">
                                  {formatMoney(s.unitPrice)} × {s.quantity} ={" "}
                                  {formatMoney(s.total)}
                                </p>
                                <p className="text-xs text-slate-400">
                                  {new Date(s.createdAt).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <p className="shrink-0 text-lg font-semibold text-green-700 sm:text-right">
                              {formatMoney(s.total)}
                            </p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
