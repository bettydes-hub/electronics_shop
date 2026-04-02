"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { readStaffSession } from "@/lib/staff-session";

function staffHeaders(): Record<string, string> {
  const { id } = readStaffSession();
  return id ? { "Content-Type": "application/json", "x-user-id": id } : { "Content-Type": "application/json" };
}

type PromotionRow = {
  id: string;
  name: string;
  scope: "PRODUCT" | "CATEGORY";
  percentOff: number;
  startsAt: string;
  endsAt: string;
  isFlashSale: boolean;
  active: boolean;
  product?: { id: string; name: string } | null;
  categoryRef?: { id: string; name: string } | null;
};

type CouponRow = {
  id: string;
  code: string;
  percentOff: number | null;
  fixedOff: number | null;
  maxUses: number | null;
  usedCount: number;
  active: boolean;
  startsAt: string | null;
  endsAt: string | null;
};

type DynamicRow = {
  id: string;
  productId: string;
  enabled: boolean;
  lowStockThreshold: number;
  lowStockMarkupPercent: number;
  highStockThreshold: number;
  highStockDiscountPercent: number;
  product: { id: string; name: string; stock: number };
};

type Cat = { id: string; name: string };
type Prod = { id: string; name: string };

export function OwnerOffersPanel({ categories, products }: { categories: Cat[]; products: Prod[] }) {
  const promoNameUniqueId = useId();
  const promoNameFieldName = `promotionName_${promoNameUniqueId.replace(/:/g, "_")}`;

  const [promotions, setPromotions] = useState<PromotionRow[]>([]);
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [dynamicRules, setDynamicRules] = useState<DynamicRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setErr(null);
    try {
      const [pr, cp, dy] = await Promise.all([
        fetch("/api/promotions"),
        fetch("/api/coupons"),
        fetch("/api/dynamic-pricing"),
      ]);
      if (pr.ok) setPromotions(await pr.json());
      if (cp.ok) setCoupons(await cp.json());
      if (dy.ok) setDynamicRules(await dy.json());
    } catch {
      setErr("Failed to load offers");
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const [promoForm, setPromoForm] = useState({
    name: "",
    scope: "CATEGORY" as "PRODUCT" | "CATEGORY",
    productId: "",
    categoryId: "",
    percentOff: "10",
    startsAt: "",
    endsAt: "",
    isFlashSale: false,
  });

  const [couponForm, setCouponForm] = useState({
    code: "",
    percentOff: "",
    fixedOff: "",
    maxUses: "",
    minOrderTotal: "0",
    startsAt: "",
    endsAt: "",
  });

  const [dynForm, setDynForm] = useState({
    productId: "",
    enabled: true,
    lowStockThreshold: "5",
    lowStockMarkupPercent: "5",
    highStockThreshold: "100",
    highStockDiscountPercent: "3",
  });

  async function createPromotion(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    const res = await fetch("/api/promotions", {
      method: "POST",
      headers: staffHeaders(),
      body: JSON.stringify({
        ...promoForm,
        percentOff: parseFloat(promoForm.percentOff),
        productId: promoForm.scope === "PRODUCT" ? promoForm.productId : undefined,
        categoryId: promoForm.scope === "CATEGORY" ? promoForm.categoryId : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "Failed");
      return;
    }
    setMsg("Promotion created");
    setPromotions((prev) => [data, ...prev]);
  }

  async function createCoupon(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    const res = await fetch("/api/coupons", {
      method: "POST",
      headers: staffHeaders(),
      body: JSON.stringify({
        code: couponForm.code,
        percentOff: couponForm.percentOff || undefined,
        fixedOff: couponForm.fixedOff || undefined,
        maxUses: couponForm.maxUses || undefined,
        minOrderTotal: couponForm.minOrderTotal || 0,
        startsAt: couponForm.startsAt || undefined,
        endsAt: couponForm.endsAt || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "Failed");
      return;
    }
    setMsg("Coupon created");
    setCoupons((prev) => [data, ...prev]);
  }

  async function saveDynamic(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    const res = await fetch("/api/dynamic-pricing", {
      method: "POST",
      headers: staffHeaders(),
      body: JSON.stringify({
        productId: dynForm.productId,
        enabled: dynForm.enabled,
        lowStockThreshold: parseInt(dynForm.lowStockThreshold, 10),
        lowStockMarkupPercent: parseFloat(dynForm.lowStockMarkupPercent),
        highStockThreshold: parseInt(dynForm.highStockThreshold, 10),
        highStockDiscountPercent: parseFloat(dynForm.highStockDiscountPercent),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErr(data.error || "Failed");
      return;
    }
    setMsg("Dynamic pricing saved");
    setDynamicRules((prev) => {
      const rest = prev.filter((r) => r.productId !== data.productId);
      return [data, ...rest];
    });
  }

  return (
    <div className="space-y-10">
      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>}
      {msg && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{msg}</p>}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900">Promotions (scheduled / category / flash)</h3>
        <form onSubmit={createPromotion} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Name</span>
            <input
              id={promoNameUniqueId}
              name={promoNameFieldName}
              required
              value={promoForm.name}
              autoComplete="new-password"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setPromoForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="Weekend phones sale"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Scope</span>
            <select
              value={promoForm.scope}
              onChange={(e) =>
                setPromoForm((f) => ({ ...f, scope: e.target.value as "PRODUCT" | "CATEGORY" }))
              }
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="CATEGORY">Whole category</option>
              <option value="PRODUCT">Single product</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">% off</span>
            <input
              required
              type="number"
              min={1}
              max={100}
              value={promoForm.percentOff}
              onChange={(e) => setPromoForm((f) => ({ ...f, percentOff: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          {promoForm.scope === "CATEGORY" ? (
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Category</span>
              <select
                required
                value={promoForm.categoryId}
                onChange={(e) => setPromoForm((f) => ({ ...f, categoryId: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">Select…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Product</span>
              <select
                required
                value={promoForm.productId}
                onChange={(e) => setPromoForm((f) => ({ ...f, productId: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">Select…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Starts (local)</span>
            <input
              required
              type="datetime-local"
              value={promoForm.startsAt}
              onChange={(e) => setPromoForm((f) => ({ ...f, startsAt: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Ends (local)</span>
            <input
              required
              type="datetime-local"
              value={promoForm.endsAt}
              onChange={(e) => setPromoForm((f) => ({ ...f, endsAt: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={promoForm.isFlashSale}
              onChange={(e) => setPromoForm((f) => ({ ...f, isFlashSale: e.target.checked }))}
            />
            <span className="text-sm text-slate-700">Mark as flash sale (same rules; for your tracking)</span>
          </label>
          <button
            type="submit"
            className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 sm:col-span-2"
          >
            Create promotion
          </button>
        </form>

        <ul className="mt-6 divide-y divide-slate-100 text-sm">
          {promotions.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <span className="font-medium text-slate-900">{p.name}</span>{" "}
                <span className="text-slate-500">
                  {p.percentOff}% · {p.scope === "CATEGORY" ? p.categoryRef?.name : p.product?.name}
                </span>
                {p.isFlashSale ? (
                  <span className="ml-2 rounded bg-amber-100 px-1.5 text-xs text-amber-900">Flash</span>
                ) : null}
                {!p.active ? (
                  <span className="ml-2 text-xs text-red-600">inactive</span>
                ) : null}
              </div>
              <button
                type="button"
                onClick={async () => {
                  await fetch(`/api/promotions/${p.id}`, { method: "DELETE", headers: staffHeaders() });
                  setPromotions((prev) => prev.filter((x) => x.id !== p.id));
                }}
                className="text-sm text-red-600 hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900">Coupon codes</h3>
        <form onSubmit={createCoupon} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Code</span>
            <input
              required
              value={couponForm.code}
              onChange={(e) => setCouponForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="SAVE20"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">% off (optional)</span>
            <input
              type="number"
              min={0}
              max={100}
              value={couponForm.percentOff}
              onChange={(e) => setCouponForm((f) => ({ ...f, percentOff: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Fixed off (optional)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={couponForm.fixedOff}
              onChange={(e) => setCouponForm((f) => ({ ...f, fixedOff: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Max uses (optional)</span>
            <input
              type="number"
              min={1}
              value={couponForm.maxUses}
              onChange={(e) => setCouponForm((f) => ({ ...f, maxUses: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Min order total</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={couponForm.minOrderTotal}
              onChange={(e) => setCouponForm((f) => ({ ...f, minOrderTotal: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Valid from (optional)</span>
            <input
              type="datetime-local"
              value={couponForm.startsAt}
              onChange={(e) => setCouponForm((f) => ({ ...f, startsAt: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Valid until (optional)</span>
            <input
              type="datetime-local"
              value={couponForm.endsAt}
              onChange={(e) => setCouponForm((f) => ({ ...f, endsAt: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 sm:col-span-2"
          >
            Create coupon
          </button>
        </form>

        <ul className="mt-6 divide-y divide-slate-100 text-sm">
          {coupons.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="font-mono font-medium">{c.code}</span>
              <span className="text-slate-600">
                {c.percentOff != null ? `${c.percentOff}%` : ""}{" "}
                {c.fixedOff != null ? `−${c.fixedOff}` : ""} · used {c.usedCount}
                {c.maxUses != null ? ` / ${c.maxUses}` : ""}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900">Dynamic pricing (per product)</h3>
        <p className="mt-1 text-sm text-slate-600">
          When stock is at or below the low threshold, price increases by the markup %. When stock is at or above the
          high threshold, price decreases by the discount %.
        </p>
        <form onSubmit={saveDynamic} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Product</span>
            <select
              required
              value={dynForm.productId}
              onChange={(e) => setDynForm((f) => ({ ...f, productId: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            >
              <option value="">Select…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 sm:col-span-2">
            <input
              type="checkbox"
              checked={dynForm.enabled}
              onChange={(e) => setDynForm((f) => ({ ...f, enabled: e.target.checked }))}
            />
            <span className="text-sm text-slate-700">Enabled</span>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Low stock ≤</span>
            <input
              type="number"
              min={0}
              value={dynForm.lowStockThreshold}
              onChange={(e) => setDynForm((f) => ({ ...f, lowStockThreshold: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Markup % (low stock)</span>
            <input
              type="number"
              min={0}
              step="0.1"
              value={dynForm.lowStockMarkupPercent}
              onChange={(e) => setDynForm((f) => ({ ...f, lowStockMarkupPercent: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">High stock ≥</span>
            <input
              type="number"
              min={0}
              value={dynForm.highStockThreshold}
              onChange={(e) => setDynForm((f) => ({ ...f, highStockThreshold: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Discount % (high stock)</span>
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={dynForm.highStockDiscountPercent}
              onChange={(e) => setDynForm((f) => ({ ...f, highStockDiscountPercent: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 sm:col-span-2"
          >
            Save rule
          </button>
        </form>

        <ul className="mt-6 divide-y divide-slate-100 text-sm">
          {dynamicRules.map((r) => (
            <li key={r.id} className="py-3">
              <span className="font-medium">{r.product.name}</span>{" "}
              <span className="text-slate-600">
                stock {r.product.stock} · {r.enabled ? "on" : "off"} · low≤{r.lowStockThreshold} +{r.lowStockMarkupPercent}% ·
                high≥{r.highStockThreshold} −{r.highStockDiscountPercent}%
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
