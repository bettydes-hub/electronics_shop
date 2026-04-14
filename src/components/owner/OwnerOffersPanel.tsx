"use client";

import { useCallback, useEffect, useId, useState } from "react";

const staffCred: RequestInit = { credentials: "include" };
const staffJson: RequestInit = {
  credentials: "include",
  headers: { "Content-Type": "application/json" },
};

type PromotionRow = {
  id: string;
  name: string;
  nameAm: string | null;
  scope: "PRODUCT" | "CATEGORY";
  percentOff: number;
  startsAt: string;
  endsAt: string;
  isFlashSale: boolean;
  active: boolean;
  product?: { id: string; name: string } | null;
  categoryRef?: { id: string; name: string } | null;
};

type Cat = { id: string; name: string };
type Prod = { id: string; name: string };

export function OwnerOffersPanel({ categories, products }: { categories: Cat[]; products: Prod[] }) {
  const promoNameUniqueId = useId();
  const promoNameFieldName = `promotionName_${promoNameUniqueId.replace(/:/g, "_")}`;

  const [promotions, setPromotions] = useState<PromotionRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setErr(null);
    try {
      const pr = await fetch("/api/promotions", staffCred);
      if (pr.ok) setPromotions(await pr.json());
    } catch {
      setErr("Failed to load offers");
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const [promoForm, setPromoForm] = useState({
    name: "",
    nameAm: "",
    scope: "CATEGORY" as "PRODUCT" | "CATEGORY",
    productId: "",
    categoryId: "",
    percentOff: "10",
    startsAt: "",
    endsAt: "",
    isFlashSale: false,
  });

  async function createPromotion(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setErr(null);
    const res = await fetch("/api/promotions", {
      ...staffJson,
      method: "POST",
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

  return (
    <div className="space-y-10">
      {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>}
      {msg && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{msg}</p>}

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-900">Promotions</h3>
        <form onSubmit={createPromotion} className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Name (English)</span>
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
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Name (አማርኛ)</span>
            <input
              value={promoForm.nameAm}
              onChange={(e) => setPromoForm((f) => ({ ...f, nameAm: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              placeholder="optional"
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
            <span className="text-sm text-slate-700">Flash sale</span>
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
                {p.nameAm ? <span className="text-slate-500">/ {p.nameAm}</span> : null}{" "}
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
                  await fetch(`/api/promotions/${p.id}`, { ...staffCred, method: "DELETE" });
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
    </div>
  );
}

