"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/format-money";
import { toDateInputValue } from "@/lib/finance-dates";

type PeriodSummary = {
  incomeTotal: number;
  salesTotal?: number;
  otherIncomeTotal?: number;
  expenseTotal: number;
  profit: number;
  label: string;
};

type PeriodsResponse = {
  week?: PeriodSummary;
  month?: PeriodSummary;
};

type IncomeRow = {
  id: string;
  date: string;
  amount: number;
  note: string | null;
  createdAt: string;
};

type ExpenseRow = {
  id: string;
  description: string;
  amount: number;
  category: string | null;
  period: string;
  date: string;
  createdAt: string;
};

type SaleRow = {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;
  date: string;
  createdAt: string;
  product?: { id: string; name: string; nameAm: string | null; stock: number; price: number };
};

type ProductOption = {
  id: string;
  name: string;
  nameAm: string | null;
  stock: number;
  price: number;
};

type AllTime = {
  incomeTotal: number;
  salesTotal?: number;
  otherIncomeTotal?: number;
  expenseTotal: number;
  profit: number;
};

const staffCred: RequestInit = { credentials: "include" };
const staffJson: RequestInit = {
  credentials: "include",
  headers: { "Content-Type": "application/json" },
};

const PERIOD_LABELS: Record<string, string> = {
  DAILY: "Today / one day",
  WEEKLY: "One week",
  MONTHLY: "One month",
  THREE_MONTHS: "3 months",
  SIX_MONTHS: "6 months",
  YEARLY: "One year",
};

function todayInputValue(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDay(raw: string): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function AdminFinancePanel({
  onFlash,
}: {
  onFlash: (type: "success" | "error", text: string) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [allTime, setAllTime] = useState<AllTime | null>(null);
  const [periods, setPeriods] = useState<PeriodsResponse | null>(null);
  const [incomeRows, setIncomeRows] = useState<IncomeRow[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);

  const [showSaleForm, setShowSaleForm] = useState(false);
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [saleForm, setSaleForm] = useState({
    productId: "",
    quantity: "1",
    unitPrice: "",
    date: todayInputValue(),
  });
  const [incomeForm, setIncomeForm] = useState({ date: todayInputValue(), amount: "", note: "" });
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    category: "",
    period: "MONTHLY",
    date: todayInputValue(),
  });
  const [saving, setSaving] = useState(false);

  type CalcPreset = "today" | "yesterday" | "week" | "month" | "threeMonths" | "year" | "custom";
  type CalcResult = {
    label: string;
    incomeTotal: number;
    salesTotal?: number;
    otherIncomeTotal?: number;
    expenseTotal: number;
    profit: number;
  };
  const [calcPreset, setCalcPreset] = useState<CalcPreset>("month");
  const [calcFrom, setCalcFrom] = useState(todayInputValue());
  const [calcTo, setCalcTo] = useState(todayInputValue());
  const [calcResult, setCalcResult] = useState<CalcResult | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === saleForm.productId) ?? null,
    [products, saleForm.productId]
  );

  const applyCalcPreset = (preset: CalcPreset) => {
    setCalcPreset(preset);
    const now = new Date();
    const toLocalYmd = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    if (preset === "custom") return;

    let from = new Date(now);
    let to = new Date(now);

    if (preset === "today") {
      // same day
    } else if (preset === "yesterday") {
      from.setDate(from.getDate() - 1);
      to = new Date(from);
    } else if (preset === "week") {
      const day = from.getDay();
      const diff = from.getDate() - day + (day === 0 ? -6 : 1);
      from.setDate(diff);
      to = new Date(from);
      to.setDate(from.getDate() + 6);
    } else if (preset === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (preset === "threeMonths") {
      from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (preset === "year") {
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31);
    }

    setCalcFrom(toLocalYmd(from));
    setCalcTo(toLocalYmd(to));
  };

  const runCalculate = async () => {
    if (!calcFrom || !calcTo) {
      onFlash("error", "Choose start and end dates");
      return;
    }
    if (calcFrom > calcTo) {
      onFlash("error", "Start date must be before end date");
      return;
    }
    setCalcLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/range?from=${encodeURIComponent(calcFrom)}&to=${encodeURIComponent(calcTo)}`,
        staffCred
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Calculate failed");
      setCalcResult({
        label: data.label,
        incomeTotal: Number(data.incomeTotal ?? 0),
        salesTotal: Number(data.salesTotal ?? 0),
        otherIncomeTotal: Number(data.otherIncomeTotal ?? 0),
        expenseTotal: Number(data.expenseTotal ?? 0),
        profit: Number(data.profit ?? 0),
      });
    } catch (err) {
      onFlash("error", err instanceof Error ? err.message : "Calculate failed");
    } finally {
      setCalcLoading(false);
    }
  };

  useEffect(() => {
    applyCalcPreset("month");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, periodsRes, incomeRes, expRes, salesRes, productsRes] = await Promise.all([
        fetch("/api/dashboard", staffCred),
        fetch("/api/dashboard/periods", staffCred),
        fetch("/api/income", staffCred),
        fetch("/api/expenses", staffCred),
        fetch("/api/sales?period=month", staffCred),
        fetch("/api/products", staffCred),
      ]);
      if (dashRes.ok) {
        const d = await dashRes.json();
        setAllTime({
          incomeTotal: Number(d.incomeTotal ?? d.totalRevenue ?? 0),
          salesTotal: Number(d.salesTotal ?? 0),
          otherIncomeTotal: Number(d.otherIncomeTotal ?? 0),
          expenseTotal: Number(d.expenseTotal ?? 0),
          profit: Number(d.profit ?? 0),
        });
      }
      if (periodsRes.ok) setPeriods(await periodsRes.json());
      if (incomeRes.ok) {
        const rows = await incomeRes.json();
        setIncomeRows(Array.isArray(rows) ? rows : []);
      }
      if (expRes.ok) {
        const rows = await expRes.json();
        setExpenses(Array.isArray(rows) ? rows : []);
      }
      if (salesRes.ok) {
        const rows = await salesRes.json();
        setSales(Array.isArray(rows) ? rows : []);
      }
      if (productsRes.ok) {
        const rows = await productsRes.json();
        if (Array.isArray(rows)) {
          setProducts(
            rows.map((p: ProductOption) => ({
              id: p.id,
              name: p.name,
              nameAm: p.nameAm ?? null,
              stock: Number(p.stock ?? 0),
              price: Number(p.price ?? 0),
            }))
          );
        }
      }
    } catch {
      onFlash("error", "Failed to load finance data");
    } finally {
      setLoading(false);
    }
  }, [onFlash]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const resetSaleForm = () => {
    setSaleForm({ productId: "", quantity: "1", unitPrice: "", date: todayInputValue() });
    setShowSaleForm(false);
  };

  const resetIncomeForm = () => {
    setIncomeForm({ date: todayInputValue(), amount: "", note: "" });
    setEditingIncomeId(null);
    setShowIncomeForm(false);
  };

  const resetExpenseForm = () => {
    setExpenseForm({
      description: "",
      amount: "",
      category: "",
      period: "MONTHLY",
      date: todayInputValue(),
    });
    setEditingExpenseId(null);
    setShowExpenseForm(false);
  };

  const startEditIncome = (row: IncomeRow) => {
    setEditingIncomeId(row.id);
    setIncomeForm({
      date: toDateInputValue(row.date) || todayInputValue(),
      amount: String(row.amount),
      note: row.note ?? "",
    });
    setShowIncomeForm(true);
    setShowExpenseForm(false);
    setShowSaleForm(false);
    setEditingExpenseId(null);
  };

  const startEditExpense = (row: ExpenseRow) => {
    setEditingExpenseId(row.id);
    setExpenseForm({
      description: row.description,
      amount: String(row.amount),
      category: row.category ?? "",
      period: row.period || "MONTHLY",
      date: toDateInputValue(row.date || row.createdAt) || todayInputValue(),
    });
    setShowExpenseForm(true);
    setShowIncomeForm(false);
    setShowSaleForm(false);
    setEditingIncomeId(null);
  };

  const handleSale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saleForm.productId) {
      onFlash("error", "Choose a product");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, string | number> = {
        productId: saleForm.productId,
        quantity: saleForm.quantity,
        date: saleForm.date,
      };
      if (saleForm.unitPrice.trim() !== "") {
        payload.unitPrice = saleForm.unitPrice;
      }
      const res = await fetch("/api/sales", {
        ...staffJson,
        method: "POST",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record sale");
      onFlash("success", "Sale recorded — stock updated and income added");
      resetSaleForm();
      await fetchAll();
    } catch (err) {
      onFlash("error", err instanceof Error ? err.message : "Failed to record sale");
    } finally {
      setSaving(false);
    }
  };

  const deleteSale = async (id: string) => {
    if (!window.confirm("Delete this sale? Stock will be restored.")) return;
    try {
      const res = await fetch(`/api/sales/${id}`, { ...staffCred, method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete sale");
      onFlash("success", "Sale deleted — stock restored");
      await fetchAll();
    } catch (err) {
      onFlash("error", err instanceof Error ? err.message : "Failed to delete sale");
    }
  };

  const handleIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        date: incomeForm.date,
        amount: incomeForm.amount,
        note: incomeForm.note || null,
      };
      const res = await fetch(
        editingIncomeId ? `/api/income/${editingIncomeId}` : "/api/income",
        {
          ...staffJson,
          method: editingIncomeId ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save income");
      onFlash("success", editingIncomeId ? "Other income updated" : "Other income recorded");
      resetIncomeForm();
      await fetchAll();
    } catch (err) {
      onFlash("error", err instanceof Error ? err.message : "Failed to save income");
    } finally {
      setSaving(false);
    }
  };

  const handleExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        description: expenseForm.description,
        amount: expenseForm.amount,
        category: expenseForm.category || null,
        period: expenseForm.period,
        date: expenseForm.date,
      };
      const res = await fetch(
        editingExpenseId ? `/api/expenses/${editingExpenseId}` : "/api/expenses",
        {
          ...staffJson,
          method: editingExpenseId ? "PATCH" : "POST",
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save expense");
      onFlash("success", editingExpenseId ? "Expense updated" : "Expense recorded");
      resetExpenseForm();
      await fetchAll();
    } catch (err) {
      onFlash("error", err instanceof Error ? err.message : "Failed to save expense");
    } finally {
      setSaving(false);
    }
  };

  const deleteIncome = async (id: string) => {
    if (!window.confirm("Delete this income entry?")) return;
    try {
      const res = await fetch(`/api/income/${id}`, { ...staffCred, method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      if (editingIncomeId === id) resetIncomeForm();
      onFlash("success", "Income deleted");
      await fetchAll();
    } catch (err) {
      onFlash("error", err instanceof Error ? err.message : "Failed to delete income");
    }
  };

  const deleteExpense = async (id: string) => {
    if (!window.confirm("Delete this expense?")) return;
    try {
      const res = await fetch(`/api/expenses/${id}`, { ...staffCred, method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to delete");
      if (editingExpenseId === id) resetExpenseForm();
      onFlash("success", "Expense deleted");
      await fetchAll();
    } catch (err) {
      onFlash("error", err instanceof Error ? err.message : "Failed to delete expense");
    }
  };

  if (loading) {
    return <p className="mt-6 text-slate-500">Loading finance…</p>;
  }

  const week = periods?.week;
  const month = periods?.month;

  return (
    <div className="mt-6 space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {week && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">This week</p>
            <p className="mt-1 text-xs text-slate-400">{week.label}</p>
            <p
              className={`mt-3 text-2xl font-bold ${week.profit >= 0 ? "text-green-700" : "text-red-600"}`}
            >
              {formatMoney(week.profit)}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Income {formatMoney(week.incomeTotal)} − Expenses {formatMoney(week.expenseTotal)}
            </p>
          </div>
        )}
        {month && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">This month</p>
            <p className="mt-1 text-xs text-slate-400">{month.label}</p>
            <p
              className={`mt-3 text-2xl font-bold ${month.profit >= 0 ? "text-green-700" : "text-red-600"}`}
            >
              {formatMoney(month.profit)}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Income {formatMoney(month.incomeTotal)} − Expenses {formatMoney(month.expenseTotal)}
            </p>
          </div>
        )}
        {allTime && (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">All time</p>
            <p
              className={`mt-3 text-2xl font-bold ${allTime.profit >= 0 ? "text-green-700" : "text-red-600"}`}
            >
              {formatMoney(allTime.profit)}
            </p>
            <p className="mt-2 text-sm text-slate-600">
              Income {formatMoney(allTime.incomeTotal)} − Expenses {formatMoney(allTime.expenseTotal)}
            </p>
            {(allTime.salesTotal != null || allTime.otherIncomeTotal != null) && (
              <p className="mt-1 text-xs text-slate-500">
                Sales {formatMoney(allTime.salesTotal ?? 0)} + Other{" "}
                {formatMoney(allTime.otherIncomeTotal ?? 0)}
              </p>
            )}
          </div>
        )}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Calculate profit / loss</h3>
        <p className="mt-1 text-sm text-slate-500">
          Pick a period or choose your own dates. Income = catalog sales + other income − expenses.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(
            [
              ["today", "Today"],
              ["yesterday", "Last day"],
              ["week", "This week"],
              ["month", "This month"],
              ["threeMonths", "3 months"],
              ["year", "This year"],
              ["custom", "Other (custom)"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => applyCalcPreset(key)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                calcPreset === key
                  ? "bg-primary-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">From</label>
            <input
              type="date"
              value={calcFrom}
              onChange={(e) => {
                setCalcPreset("custom");
                setCalcFrom(e.target.value);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">To</label>
            <input
              type="date"
              value={calcTo}
              onChange={(e) => {
                setCalcPreset("custom");
                setCalcTo(e.target.value);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void runCalculate()}
              disabled={calcLoading}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {calcLoading ? "Calculating…" : "Calculate"}
            </button>
          </div>
        </div>
        {calcResult && (
          <div className="mt-4 grid gap-3 rounded-lg border border-slate-100 bg-slate-50 p-4 sm:grid-cols-4">
            <div className="sm:col-span-4 text-sm text-slate-600">{calcResult.label}</div>
            <div>
              <p className="text-xs uppercase text-slate-500">Income</p>
              <p className="text-lg font-semibold text-green-700">{formatMoney(calcResult.incomeTotal)}</p>
              {(calcResult.salesTotal != null || calcResult.otherIncomeTotal != null) && (
                <p className="text-xs text-slate-500">
                  Sales {formatMoney(calcResult.salesTotal ?? 0)} + Other{" "}
                  {formatMoney(calcResult.otherIncomeTotal ?? 0)}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Expenses</p>
              <p className="text-lg font-semibold text-red-600">{formatMoney(calcResult.expenseTotal)}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs uppercase text-slate-500">Profit / loss</p>
              <p
                className={`text-xl font-bold ${
                  calcResult.profit >= 0 ? "text-green-700" : "text-red-600"
                }`}
              >
                {formatMoney(calcResult.profit)}
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Record sales</h3>
            <p className="mt-1 text-sm text-slate-500">
              Log items sold from the store. Amount is added to income and stock is reduced. When
              stock hits 0, customers see Sold out.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (showSaleForm) resetSaleForm();
              else {
                setSaleForm({ productId: "", quantity: "1", unitPrice: "", date: todayInputValue() });
                setShowSaleForm(true);
                setShowIncomeForm(false);
                setShowExpenseForm(false);
              }
            }}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            {showSaleForm ? "Cancel" : "Add sale"}
          </button>
        </div>
        {showSaleForm && (
          <form onSubmit={handleSale} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Product</label>
              <select
                required
                value={saleForm.productId}
                onChange={(e) => {
                  const id = e.target.value;
                  const p = products.find((x) => x.id === id);
                  setSaleForm((f) => ({
                    ...f,
                    productId: id,
                    unitPrice: p ? String(p.price) : f.unitPrice,
                  }));
                }}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="">Select product…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.stock <= 0}>
                    {p.name}
                    {p.nameAm ? ` / ${p.nameAm}` : ""} — stock {p.stock}
                    {p.stock <= 0 ? " (sold out)" : ""}
                  </option>
                ))}
              </select>
              {selectedProduct && (
                <p className="mt-1 text-xs text-slate-500">
                  In stock: {selectedProduct.stock} · Catalog price:{" "}
                  {formatMoney(selectedProduct.price)}
                </p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Quantity</label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={saleForm.quantity}
                onChange={(e) => setSaleForm((f) => ({ ...f, quantity: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Unit price (optional)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={saleForm.unitPrice}
                onChange={(e) => setSaleForm((f) => ({ ...f, unitPrice: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="Uses catalog price if empty"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date sold</label>
              <input
                type="date"
                required
                value={saleForm.date}
                onChange={(e) => setSaleForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save sale"}
              </button>
            </div>
          </form>
        )}
        <ul className="mt-4 divide-y divide-slate-100">
          {sales.length === 0 ? (
            <li className="py-4 text-sm text-slate-500">No sales recorded this month yet.</li>
          ) : (
            sales.slice(0, 40).map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <span className="font-medium text-slate-900">
                    {row.product?.name ?? "Product"}
                  </span>
                  <span className="ml-2 text-slate-500">
                    ×{row.quantity} @ {formatMoney(row.unitPrice)}
                  </span>
                  <span className="ml-2 text-slate-500">{formatDay(row.date || row.createdAt)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-green-700">{formatMoney(row.total)}</span>
                  <button
                    type="button"
                    onClick={() => void deleteSale(row.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Other income</h3>
            <p className="mt-1 text-sm text-slate-500">
              Money from something not listed in the catalog — counted in daily income, no stock
              change.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (showIncomeForm) resetIncomeForm();
              else {
                setEditingIncomeId(null);
                setIncomeForm({ date: todayInputValue(), amount: "", note: "" });
                setShowIncomeForm(true);
                setShowSaleForm(false);
                setShowExpenseForm(false);
              }
            }}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            {showIncomeForm ? "Cancel" : "Add other income"}
          </button>
        </div>
        {showIncomeForm && (
          <form onSubmit={handleIncome} className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                required
                value={incomeForm.date}
                onChange={(e) => setIncomeForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={incomeForm.amount}
                onChange={(e) => setIncomeForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Note (optional)</label>
              <input
                type="text"
                value={incomeForm.note}
                onChange={(e) => setIncomeForm((f) => ({ ...f, note: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="e.g. repair fee / off-catalog item"
              />
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "Saving…" : editingIncomeId ? "Update other income" : "Save other income"}
              </button>
            </div>
          </form>
        )}
        <ul className="mt-4 divide-y divide-slate-100">
          {incomeRows.length === 0 ? (
            <li className="py-4 text-sm text-slate-500">No other income recorded yet.</li>
          ) : (
            incomeRows.slice(0, 30).map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <span className="font-medium text-slate-900">{formatDay(row.date)}</span>
                  {row.note ? <span className="ml-2 text-slate-500">{row.note}</span> : null}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-green-700">{formatMoney(row.amount)}</span>
                  <button
                    type="button"
                    onClick={() => startEditIncome(row)}
                    className="text-primary-700 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteIncome(row.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-slate-900">Expenses</h3>
          <button
            type="button"
            onClick={() => {
              if (showExpenseForm) resetExpenseForm();
              else {
                setEditingExpenseId(null);
                setExpenseForm({
                  description: "",
                  amount: "",
                  category: "",
                  period: "MONTHLY",
                  date: todayInputValue(),
                });
                setShowExpenseForm(true);
                setShowSaleForm(false);
                setShowIncomeForm(false);
              }
            }}
            className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
          >
            {showExpenseForm ? "Cancel" : "Add expense"}
          </button>
        </div>
        {showExpenseForm && (
          <form onSubmit={handleExpense} className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <input
                type="text"
                required
                value={expenseForm.description}
                onChange={(e) => setExpenseForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="e.g. Rent"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
              <input
                type="date"
                required
                value={expenseForm.date}
                onChange={(e) => setExpenseForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Covers</label>
              <select
                value={expenseForm.period}
                onChange={(e) => setExpenseForm((f) => ({ ...f, period: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
              >
                <option value="DAILY">Today / one day</option>
                <option value="WEEKLY">One week</option>
                <option value="MONTHLY">One month</option>
                <option value="THREE_MONTHS">3 months</option>
                <option value="SIX_MONTHS">6 months</option>
                <option value="YEARLY">One year</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Category (optional)</label>
              <input
                type="text"
                value={expenseForm.category}
                onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="e.g. rent, utilities"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? "Saving…" : editingExpenseId ? "Update expense" : "Save expense"}
              </button>
            </div>
          </form>
        )}
        <ul className="mt-4 divide-y divide-slate-100">
          {expenses.length === 0 ? (
            <li className="py-4 text-sm text-slate-500">No expenses recorded yet.</li>
          ) : (
            expenses.slice(0, 30).map((row) => (
              <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <span className="font-medium text-slate-900">{row.description}</span>
                  {row.category ? (
                    <span className="ml-2 text-slate-500">({row.category})</span>
                  ) : null}
                  <span className="ml-2 text-slate-500">{formatDay(row.date || row.createdAt)}</span>
                  <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                    {PERIOD_LABELS[row.period] ?? row.period}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-red-600">{formatMoney(row.amount)}</span>
                  <button
                    type="button"
                    onClick={() => startEditExpense(row)}
                    className="text-primary-700 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteExpense(row.id)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>
    </div>
  );
}
