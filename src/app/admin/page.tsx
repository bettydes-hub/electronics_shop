"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageBack } from "@/components/ui/PageBack";
import { formatMoney } from "@/lib/format-money";
import {
  DEFAULT_PRODUCT_IMAGE_MAX,
  DEFAULT_PRODUCT_IMAGE_MIN,
  PRODUCT_IMAGE_HARD_MAX,
  PRODUCT_IMAGE_HARD_MIN,
} from "@/lib/product-image-policy";
import { StaffDashboardGateFallback, useStaffDashboardGate } from "@/lib/staff-dashboard-gate";
import { canManageStaff, readStaffSession } from "@/lib/staff-session";
import { StaffNavSession } from "@/components/staff/StaffNavSession";

type Product = {
  id: string;
  name: string;
  description: string | null;
  nameAm: string | null;
  descriptionAm: string | null;
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
  nameAm: string | null;
  slug: string | null;
  _count?: { products: number };
};

type StaffRow = {
  id: string;
  username: string | null;
  email: string;
  name: string;
  role: string;
  staffStatus: string;
  createdAt: string;
};

type Tab = "products" | "categories" | "staff" | "store";

const TAB_LABELS: Record<Tab, string> = {
  products: "Products",
  categories: "Categories",
  staff: "Staff",
  store: "Store & footer",
};

type AdminFlash = { tab: Tab; type: "success" | "error"; text: string };

function AdminTabFlash({ flash, tab }: { flash: AdminFlash | null; tab: Tab }) {
  if (!flash || flash.tab !== tab) return null;
  return (
    <div
      className={`mt-3 rounded-lg px-4 py-2 text-sm ${
        flash.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
      }`}
      role="status"
    >
      {flash.text}
    </div>
  );
}

function adminHeaders(): Record<string, string> {
  const { id } = readStaffSession();
  return id ? { "x-user-id": id } : {};
}

export default function AdminPage() {
  const gate = useStaffDashboardGate("admin");
  const [activeTab, setActiveTab] = useState<Tab>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<AdminFlash | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    nameAm: "",
    descriptionAm: "",
    price: "",
    costPrice: "",
    category: "",
    categoryId: "",
    imageUrls: [] as string[],
    stock: "",
  });
  const [catForm, setCatForm] = useState({ name: "", nameAm: "", slug: "" });
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryEditForm, setCategoryEditForm] = useState({ name: "", nameAm: "", slug: "" });
  const [recategorizeCategory, setRecategorizeCategory] = useState<Category | null>(null);
  const [productNewCategory, setProductNewCategory] = useState<Record<string, string>>({});
  const [storeForm, setStoreForm] = useState({
    storeName: "",
    address: "",
    phone: "",
    tiktokUrl: "",
    instagramUrl: "",
    telegramUrl: "",
    productImageCountMin: String(DEFAULT_PRODUCT_IMAGE_MIN),
    productImageCountMax: String(DEFAULT_PRODUCT_IMAGE_MAX),
  });
  const [imageLimits, setImageLimits] = useState({
    min: DEFAULT_PRODUCT_IMAGE_MIN,
    max: DEFAULT_PRODUCT_IMAGE_MAX,
  });
  const [storeSaving, setStoreSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [userForm, setUserForm] = useState({
    email: "",
    role: "SELLER",
  });
  const [resendingUserId, setResendingUserId] = useState<string | null>(null);

  const showMsg = (tab: Tab, type: "success" | "error", text: string) => {
    setFlash({ tab, type, text });
    setTimeout(() => setFlash(null), 4000);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const headers = adminHeaders();
      const [p, c, uRes, settingsRes] = await Promise.all([
        fetch("/api/products").then((r) => r.json()),
        fetch("/api/categories").then((r) => r.json()),
        fetch("/api/users", { headers }),
        fetch("/api/shop-settings"),
      ]);
      setProducts(Array.isArray(p) ? p : []);
      setCategories(Array.isArray(c) ? c : []);
      const u = await uRes.json().catch(() => []);
      setUsers(Array.isArray(u) && uRes.ok ? u : []);
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
    } catch (e) {
      showMsg("products", "error", "Failed to load data");
    }
    setLoading(false);
  };

  useEffect(() => {
    if (gate !== "ok") return;
    fetchAll();
  }, [gate]);

  useEffect(() => {
    if (gate !== "ok" || activeTab !== "store") return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch("/api/shop-settings");
        const data = await r.json();
        if (cancelled || data?.error) return;
        setStoreForm({
          storeName: typeof data.storeName === "string" ? data.storeName : "",
          address: typeof data.address === "string" ? data.address : "",
          phone: typeof data.phone === "string" ? data.phone : "",
          tiktokUrl: typeof data.tiktokUrl === "string" ? data.tiktokUrl : "",
          instagramUrl: typeof data.instagramUrl === "string" ? data.instagramUrl : "",
          telegramUrl: typeof data.telegramUrl === "string" ? data.telegramUrl : "",
          productImageCountMin: String(
            typeof data.productImageCountMin === "number"
              ? data.productImageCountMin
              : DEFAULT_PRODUCT_IMAGE_MIN
          ),
          productImageCountMax: String(
            typeof data.productImageCountMax === "number"
              ? data.productImageCountMax
              : DEFAULT_PRODUCT_IMAGE_MAX
          ),
        });
        if (
          typeof data.productImageCountMin === "number" &&
          typeof data.productImageCountMax === "number"
        ) {
          setImageLimits({ min: data.productImageCountMin, max: data.productImageCountMax });
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeTab, gate]);

  const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  };

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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    const current = form.imageUrls?.length ?? 0;
    const remaining = imageLimits.max - current;
    const toAdd = files.slice(0, Math.max(0, remaining));
    if (toAdd.length === 0) {
      showMsg("products", "error", `Maximum ${imageLimits.max} images allowed`);
      return;
    }
    setUploading(true);
    const newUrls: string[] = [];
    for (const file of toAdd) {
      try {
        const dataUrl = file.type.startsWith("image/")
          ? await compressAndGetDataUrl(file)
          : await fileToDataUrl(file);
        newUrls.push(dataUrl);
      } catch (err) {
        showMsg("products", "error", err instanceof Error ? err.message : "Upload failed");
        break;
      }
    }
    setForm((f) => ({ ...f, imageUrls: [...(f.imageUrls || []), ...newUrls] }));
    setUploading(false);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setForm((f) => ({
      ...f,
      imageUrls: (f.imageUrls || []).filter((_, i) => i !== index),
    }));
  };

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const urls = form.imageUrls || [];
    if (urls.length < imageLimits.min || urls.length > imageLimits.max) {
      showMsg(
        "products",
        "error",
        `Product must have ${imageLimits.min} to ${imageLimits.max} images`
      );
      return;
    }
    const categoryValue = form.categoryId
      ? categories.find((c) => c.id === form.categoryId)?.name || null
      : form.category?.trim() || null;
    const payload: Record<string, unknown> = {
      name: form.name,
      description: form.description || null,
      nameAm: form.nameAm.trim() || null,
      descriptionAm: form.descriptionAm.trim() || null,
      price: parseFloat(form.price) || 0,
      costPrice: form.costPrice ? parseFloat(form.costPrice) : null,
      category: categoryValue,
      stock: form.stock ? parseInt(form.stock, 10) : 0,
    };
    payload.imageUrls = urls;
    try {
      if (editingId) {
        const res = await fetch(`/api/products/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        showMsg("products", "success", "Product updated");
      } else {
        const res = await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        showMsg("products", "success", "Product created");
      }
      setForm({
        name: "",
        description: "",
        nameAm: "",
        descriptionAm: "",
        price: "",
        costPrice: "",
        category: "",
        categoryId: "",
        imageUrls: [],
        stock: "",
      });
      setShowForm(false);
      setEditingId(null);
      fetchAll();
    } catch (err) {
      showMsg("products", "error", err instanceof Error ? err.message : "Failed to save product");
    }
  };

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({
          name: catForm.name.trim(),
          nameAm: catForm.nameAm.trim() || null,
          slug: catForm.slug.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      showMsg("categories", "success", "Category created");
      setCatForm({ name: "", nameAm: "", slug: "" });
      fetchAll();
    } catch (err) {
      showMsg("categories", "error", err instanceof Error ? err.message : "Failed to create category");
    }
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.email?.trim()) {
      showMsg("staff", "error", "Email is required");
      return;
    }
    const session = readStaffSession();
    if (!session.id || !canManageStaff(session.role)) {
      showMsg("staff", "error", "Admin or Owner sign-in required.");
      return;
    }
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify({
          email: userForm.email.trim(),
          role: userForm.role,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed");
      if (data.verificationEmailSent === false && data.verificationEmailError) {
        showMsg("staff", "error", `Email not sent: ${data.verificationEmailError}`);
      } else {
        showMsg("staff", "success", `Invite sent to ${userForm.email.trim()}.`);
      }
      setUserForm({
        email: "",
        role: "SELLER",
      });
      fetchAll();
    } catch (err) {
      showMsg("staff", "error", err instanceof Error ? err.message : "Failed to invite staff");
    }
  };

  const handleResendInvite = async (userId: string) => {
    const session = readStaffSession();
    if (!session.id || !canManageStaff(session.role)) {
      showMsg("staff", "error", "Admin or Owner sign-in required.");
      return;
    }
    setResendingUserId(userId);
    try {
      const res = await fetch(`/api/users/${userId}/resend-invite`, {
        method: "POST",
        headers: adminHeaders(),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed");
      showMsg("staff", "success", "A new verification code was emailed.");
      fetchAll();
    } catch (e) {
      showMsg("staff", "error", e instanceof Error ? e.message : "Failed to resend");
    }
    setResendingUserId(null);
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm("Remove this staff account?")) return;
    const session = readStaffSession();
    if (!session.id || !canManageStaff(session.role)) {
      showMsg("staff", "error", "Admin or Owner sign-in required to remove staff.");
      return;
    }
    try {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE", headers: adminHeaders() });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Failed");
      showMsg("staff", "success", "Staff removed");
      fetchAll();
    } catch (e) {
      showMsg("staff", "error", e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const handleStoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { id: userId, role } = readStaffSession();
    if (!userId || !canManageStaff(role)) {
      showMsg("store", "error", "Admin or Owner sign-in required.");
      return;
    }
    setStoreSaving(true);
    try {
      const res = await fetch("/api/shop-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          storeName: storeForm.storeName,
          address: storeForm.address,
          phone: storeForm.phone,
          tiktokUrl: storeForm.tiktokUrl,
          instagramUrl: storeForm.instagramUrl,
          telegramUrl: storeForm.telegramUrl,
          productImageCountMin: parseInt(storeForm.productImageCountMin, 10),
          productImageCountMax: parseInt(storeForm.productImageCountMax, 10),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setStoreForm({
        storeName: typeof data.storeName === "string" ? data.storeName : "",
        address: typeof data.address === "string" ? data.address : "",
        phone: typeof data.phone === "string" ? data.phone : "",
        tiktokUrl: typeof data.tiktokUrl === "string" ? data.tiktokUrl : "",
        instagramUrl: typeof data.instagramUrl === "string" ? data.instagramUrl : "",
        telegramUrl: typeof data.telegramUrl === "string" ? data.telegramUrl : "",
        productImageCountMin: String(
          typeof data.productImageCountMin === "number"
            ? data.productImageCountMin
            : DEFAULT_PRODUCT_IMAGE_MIN
        ),
        productImageCountMax: String(
          typeof data.productImageCountMax === "number"
            ? data.productImageCountMax
            : DEFAULT_PRODUCT_IMAGE_MAX
        ),
      });
      if (
        typeof data.productImageCountMin === "number" &&
        typeof data.productImageCountMax === "number"
      ) {
        setImageLimits({ min: data.productImageCountMin, max: data.productImageCountMax });
      }
      showMsg("store", "success", "Saved.");
    } catch (err) {
      showMsg("store", "error", err instanceof Error ? err.message : "Failed to save");
    }
    setStoreSaving(false);
  };

  const handleEditProduct = (p: Product) => {
    const matchingCat = p.category ? categories.find((c) => c.name === p.category) : null;
    const urls = (p.imageUrls && p.imageUrls.length > 0) ? p.imageUrls : (p.imageUrl ? [p.imageUrl] : []);
    setForm({
      name: p.name,
      description: p.description || "",
      nameAm: p.nameAm || "",
      descriptionAm: p.descriptionAm || "",
      price: String(p.price),
      costPrice: p.costPrice != null ? String(p.costPrice) : "",
      category: matchingCat ? "" : p.category || "",
      categoryId: matchingCat?.id || "",
      imageUrls: urls,
      stock: String(p.stock),
    });
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await fetch(`/api/products/${id}`, { method: "DELETE" });
      showMsg("products", "success", "Product deleted");
      fetchAll();
    } catch {
      showMsg("products", "error", "Failed to delete");
    }
  };

  const getProductsInCategory = (categoryName: string) =>
    products.filter((p) => p.category === categoryName);

  const handleDeleteCategory = async (c: Category) => {
    const count = c._count?.products ?? getProductsInCategory(c.name).length;
    if (count > 0) {
      setRecategorizeCategory(c);
      return;
    }
    if (!confirm("Delete this category?")) return;
    try {
      await fetch(`/api/categories/${c.id}`, { method: "DELETE", headers: adminHeaders() });
      showMsg("categories", "success", "Category deleted");
      fetchAll();
    } catch {
      showMsg("categories", "error", "Failed to delete");
    }
  };

  const handleRenameCategory = (c: Category) => {
    setEditingCategoryId(c.id);
    setCategoryEditForm({ name: c.name, nameAm: c.nameAm || "", slug: c.slug || "" });
  };

  const handleCategoryUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategoryId) return;
    try {
      const res = await fetch(`/api/categories/${editingCategoryId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...adminHeaders() },
        body: JSON.stringify(categoryEditForm),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      showMsg("categories", "success", "Category updated");
      setEditingCategoryId(null);
      fetchAll();
    } catch (err) {
      showMsg("categories", "error", err instanceof Error ? err.message : "Failed to update");
    }
  };

  const handleRecategorizeApply = async () => {
    if (!recategorizeCategory) return;
    const updates = Object.entries(productNewCategory).filter(([, v]) => v);
    if (updates.length === 0) {
      showMsg("categories", "error", "Assign each product to a new category first");
      return;
    }
    try {
      for (const [productId, newCatName] of updates) {
        await fetch(`/api/products/${productId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category: newCatName }),
        });
      }
      await fetch(`/api/categories/${recategorizeCategory.id}`, {
        method: "DELETE",
        headers: adminHeaders(),
      });
      showMsg("categories", "success", "Products recategorized and category deleted");
      setRecategorizeCategory(null);
      setProductNewCategory({});
      fetchAll();
    } catch (err) {
      showMsg("categories", "error", err instanceof Error ? err.message : "Failed");
    }
  };

  const closeRecategorize = () => {
    setRecategorizeCategory(null);
    setProductNewCategory({});
  };

  const resetProductForm = () => {
    setForm({
      name: "",
      description: "",
      nameAm: "",
      descriptionAm: "",
      price: "",
      costPrice: "",
      category: "",
      categoryId: "",
      imageUrls: [],
      stock: "",
    });
    setShowForm(false);
    setEditingId(null);
  };

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
          <StaffNavSession staffElevateHref="/login?next=/admin" />
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold text-slate-900">Admin Panel</h1>

        <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200">
          {(["products", "categories", "staff", "store"] as Tab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`border-b-2 px-4 py-2 font-medium ${
                activeTab === tab
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-slate-500">Loading...</p>
        ) : (
          <>
            {activeTab === "products" && (
              <div>
                {!showForm ? (
                  <button
                    onClick={() => setShowForm(true)}
                    className="mb-6 rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
                  >
                    Add Product
                  </button>
                ) : (
                  <form onSubmit={handleProductSubmit} className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h3 className="mb-4 font-semibold">{editingId ? "Edit" : "Add"} Product</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium">Name (English) *</label>
                        <input
                          type="text"
                          required
                          value={form.name}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Name (አማርኛ)</label>
                        <input
                          type="text"
                          value={form.nameAm}
                          onChange={(e) => setForm((f) => ({ ...f, nameAm: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          placeholder="Optional — storefront falls back to English"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Price (ETB) *</label>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={form.price}
                          onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-sm font-medium">Description (English)</label>
                        <textarea
                          value={form.description}
                          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                          rows={2}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="mb-1 block text-sm font-medium">Description (አማርኛ)</label>
                        <textarea
                          value={form.descriptionAm}
                          onChange={(e) => setForm((f) => ({ ...f, descriptionAm: e.target.value }))}
                          rows={2}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                          placeholder="Optional — storefront falls back to English"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Cost Price (ETB)</label>
                        <input
                          type="number"
                          step="0.01"
                          value={form.costPrice}
                          onChange={(e) => setForm((f) => ({ ...f, costPrice: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Stock</label>
                        <input
                          type="number"
                          value={form.stock}
                          onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">Category</label>
                        <select
                          value={form.categoryId}
                          onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        >
                          <option value="">No category</option>
                          {categories.map((c) => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="mb-1 block text-sm font-medium">
                        Images ({imageLimits.min}–{imageLimits.max}) *
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {(form.imageUrls || []).map((url, i) => (
                          <div key={i} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeImage(i)}
                              className="absolute right-1 top-1 rounded bg-red-600 px-1.5 py-0.5 text-xs text-white"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        {(form.imageUrls?.length ?? 0) < imageLimits.max && (
                          <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border border-dashed border-slate-300 hover:bg-slate-50">
                            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
                            <span className="text-slate-500">{uploading ? "…" : "+"}</span>
                          </label>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700">
                        {editingId ? "Update" : "Add"} Product
                      </button>
                      <button type="button" onClick={resetProductForm} className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
                <AdminTabFlash flash={flash} tab="products" />
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  {products.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No products. Click Add Product to start.</div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {products.map((p) => (
                        <div key={p.id} className="flex items-center gap-4 px-6 py-4">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                            {(p.imageUrls?.[0] ?? p.imageUrl) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={p.imageUrls?.[0] ?? p.imageUrl ?? ""} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-slate-400">—</div>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{p.name}</p>
                            <p className="text-sm text-slate-500">
                              {formatMoney(p.price)} • Stock: {p.stock}
                              {p.category && ` • ${p.category}`}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditProduct(p)} className="rounded border px-3 py-1.5 text-sm hover:bg-slate-50">
                              Edit
                            </button>
                            <button onClick={() => handleDeleteProduct(p.id)} className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
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

            {activeTab === "categories" && (
              <div>
                <form onSubmit={handleCategorySubmit} className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-4 font-semibold">Add Category</h3>
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Name (English) *</label>
                      <input
                        type="text"
                        required
                        value={catForm.name}
                        onChange={(e) => setCatForm((f) => ({ ...f, name: e.target.value }))}
                        placeholder="e.g. Phones"
                        className="rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Name (አማርኛ)</label>
                      <input
                        type="text"
                        value={catForm.nameAm}
                        onChange={(e) => setCatForm((f) => ({ ...f, nameAm: e.target.value }))}
                        placeholder="Optional — URL stays English-based"
                        className="rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Slug</label>
                      <input
                        type="text"
                        value={catForm.slug}
                        onChange={(e) => setCatForm((f) => ({ ...f, slug: e.target.value }))}
                        placeholder="e.g. phones (optional)"
                        className="rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div className="flex items-end">
                      <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700">
                        Add Category
                      </button>
                    </div>
                  </div>
                </form>
                <AdminTabFlash flash={flash} tab="categories" />
                {recategorizeCategory && (
                  <div className="mb-6 rounded-xl border-2 border-amber-200 bg-amber-50 p-6">
                    <h3 className="mb-2 font-semibold text-amber-900">
                      &quot;{recategorizeCategory.name}&quot; has products — recategorize or rename
                    </h3>
                    <p className="mb-4 text-sm text-amber-800">Pick a new category for each product.</p>
                    <div className="space-y-2">
                      {getProductsInCategory(recategorizeCategory.name).map((p) => (
                        <div key={p.id} className="flex items-center gap-4 rounded bg-white p-3">
                          <span className="min-w-[120px] font-medium">{p.name}</span>
                          <select
                            value={productNewCategory[p.id] ?? ""}
                            onChange={(e) => setProductNewCategory((prev) => ({ ...prev, [p.id]: e.target.value }))}
                            className="rounded border border-slate-300 px-3 py-1.5 text-sm"
                          >
                            <option value="">— Select new category —</option>
                            {categories.filter((cat) => cat.id !== recategorizeCategory.id).map((cat) => (
                              <option key={cat.id} value={cat.name}>{cat.name}</option>
                            ))}
                            <option value="">No category</option>
                          </select>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button onClick={handleRecategorizeApply} className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700">
                        Apply & Delete Category
                      </button>
                      <button onClick={() => { setRecategorizeCategory(null); setProductNewCategory({}); handleRenameCategory(recategorizeCategory); }} className="rounded-lg border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50">
                        Rename Instead
                      </button>
                      <button onClick={closeRecategorize} className="rounded-lg border border-slate-300 px-4 py-2 font-medium hover:bg-slate-50">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <h3 className="border-b border-slate-200 px-6 py-4 font-semibold">Categories ({categories.length})</h3>
                  {categories.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No categories yet.</div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {categories.map((c) => {
                        const prodCount = c._count?.products ?? getProductsInCategory(c.name).length;
                        const isEditing = editingCategoryId === c.id;
                        return (
                          <div key={c.id} className="px-6 py-4">
                            {isEditing ? (
                              <form onSubmit={handleCategoryUpdateSubmit} className="flex flex-wrap items-end gap-4">
                                <div>
                                  <label className="mb-1 block text-sm font-medium">Name (English) *</label>
                                  <input
                                    type="text"
                                    required
                                    value={categoryEditForm.name}
                                    onChange={(e) => setCategoryEditForm((f) => ({ ...f, name: e.target.value }))}
                                    className="rounded-lg border border-slate-300 px-3 py-2"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-sm font-medium">Name (አማርኛ)</label>
                                  <input
                                    type="text"
                                    value={categoryEditForm.nameAm}
                                    onChange={(e) =>
                                      setCategoryEditForm((f) => ({ ...f, nameAm: e.target.value }))
                                    }
                                    className="rounded-lg border border-slate-300 px-3 py-2"
                                  />
                                </div>
                                <div>
                                  <label className="mb-1 block text-sm font-medium">Slug</label>
                                  <input
                                    type="text"
                                    value={categoryEditForm.slug}
                                    onChange={(e) => setCategoryEditForm((f) => ({ ...f, slug: e.target.value }))}
                                    className="rounded-lg border border-slate-300 px-3 py-2"
                                  />
                                </div>
                                <button type="submit" className="rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700">
                                  Save
                                </button>
                                <button type="button" onClick={() => setEditingCategoryId(null)} className="rounded-lg border border-slate-300 px-4 py-2 hover:bg-slate-50">
                                  Cancel
                                </button>
                              </form>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{c.name}</p>
                                  {c.nameAm ? (
                                    <p className="text-sm text-slate-600">{c.nameAm}</p>
                                  ) : null}
                                  <p className="text-sm text-slate-500">{c.slug || "—"} • {prodCount} products</p>
                                </div>
                                <div className="flex gap-2">
                                  <button onClick={() => handleRenameCategory(c)} className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50">
                                    Rename
                                  </button>
                                  <button onClick={() => handleDeleteCategory(c)} className="rounded border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                                    Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "staff" && (
              <div>
                <form
                  onSubmit={handleUserSubmit}
                  className="mb-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <h3 className="mb-2 font-semibold">Invite staff</h3>
                  <p className="mb-4 text-sm text-slate-500">
                    They get a code by email, then finish at{" "}
                    <Link href="/register" className="font-medium text-primary-600 hover:underline">
                      /register
                    </Link>
                    .
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Email *</label>
                      <input
                        type="email"
                        required
                        value={userForm.email}
                        onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        placeholder="colleague@company.com"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Role *</label>
                      <select
                        value={userForm.role}
                        onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      >
                        <option value="OWNER">Owner</option>
                        <option value="SELLER">Seller</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="mt-4 rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700"
                  >
                    Send invite
                  </button>
                </form>
                <AdminTabFlash flash={flash} tab="staff" />

                <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
                  <h3 className="border-b border-slate-200 px-6 py-4 font-semibold">
                    Staff ({users.length})
                  </h3>
                  {users.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No staff yet.</div>
                  ) : (
                    <div className="divide-y divide-slate-200">
                      {users.map((u) => {
                        const currentStaffId = readStaffSession().id;
                        const isSelf = Boolean(currentStaffId && u.id === currentStaffId);
                        return (
                        <div
                          key={u.id}
                          className="flex flex-col gap-2 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-medium text-slate-900">
                              {u.staffStatus === "INVITED"
                                ? "Pending invitation"
                                : u.username
                                  ? u.username
                                  : u.name}
                              {u.staffStatus !== "INVITED" &&
                              u.username &&
                              u.name !== u.username ? (
                                <span className="font-normal text-slate-500"> ({u.name})</span>
                              ) : null}
                              {isSelf ? (
                                <span className="ml-2 font-normal text-sm text-slate-500">(you)</span>
                              ) : null}
                            </p>
                            <p className="text-sm text-slate-600">
                              {u.email} ·{" "}
                              <span className="font-medium text-primary-600">{u.role}</span>
                              {u.staffStatus === "INVITED" && (
                                <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900">
                                  Awaiting registration
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {u.staffStatus === "INVITED" && (
                              <button
                                type="button"
                                disabled={resendingUserId === u.id}
                                onClick={() => handleResendInvite(u.id)}
                                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                              >
                                {resendingUserId === u.id ? "Sending…" : "Resend code"}
                              </button>
                            )}
                            {!isSelf && (
                              <button
                                type="button"
                                onClick={() => handleDeleteUser(u.id)}
                                className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "store" && (
              <div>
                <form onSubmit={handleStoreSubmit} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-2 font-semibold">Store & customer footer</h3>
                  <div className="grid max-w-2xl gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium">Store name *</label>
                      <input
                        type="text"
                        required
                        value={storeForm.storeName}
                        onChange={(e) => setStoreForm((f) => ({ ...f, storeName: e.target.value }))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Address</label>
                      <textarea
                        value={storeForm.address}
                        onChange={(e) => setStoreForm((f) => ({ ...f, address: e.target.value }))}
                        rows={4}
                        placeholder="Street, building, city (one line or many)"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Phone</label>
                      <input
                        type="text"
                        value={storeForm.phone}
                        onChange={(e) => setStoreForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="+251 …"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">TikTok URL</label>
                      <input
                        type="url"
                        value={storeForm.tiktokUrl}
                        onChange={(e) => setStoreForm((f) => ({ ...f, tiktokUrl: e.target.value }))}
                        placeholder="https://www.tiktok.com/@…"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Instagram URL</label>
                      <input
                        type="url"
                        value={storeForm.instagramUrl}
                        onChange={(e) => setStoreForm((f) => ({ ...f, instagramUrl: e.target.value }))}
                        placeholder="https://instagram.com/…"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium">Telegram URL</label>
                      <input
                        type="url"
                        value={storeForm.telegramUrl}
                        onChange={(e) => setStoreForm((f) => ({ ...f, telegramUrl: e.target.value }))}
                        placeholder="https://t.me/…"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Min product images
                        </label>
                        <input
                          type="number"
                          min={PRODUCT_IMAGE_HARD_MIN}
                          max={PRODUCT_IMAGE_HARD_MAX}
                          value={storeForm.productImageCountMin}
                          onChange={(e) =>
                            setStoreForm((f) => ({ ...f, productImageCountMin: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium">
                          Max product images
                        </label>
                        <input
                          type="number"
                          min={PRODUCT_IMAGE_HARD_MIN}
                          max={PRODUCT_IMAGE_HARD_MAX}
                          value={storeForm.productImageCountMax}
                          onChange={(e) =>
                            setStoreForm((f) => ({ ...f, productImageCountMax: e.target.value }))
                          }
                          className="w-full rounded-lg border border-slate-300 px-3 py-2"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={storeSaving}
                    className="mt-6 rounded-lg bg-primary-600 px-4 py-2 font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                  >
                    {storeSaving ? "Saving…" : "Save footer"}
                  </button>
                  <AdminTabFlash flash={flash} tab="store" />
                </form>
              </div>
            )}

          </>
        )}
      </main>
    </div>
  );
}
