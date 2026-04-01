"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { ShopNav } from "@/components/catalog/ShopNav";
import { PageBack } from "@/components/ui/PageBack";
import { formatMoney } from "@/lib/format-money";

type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  imageUrl: string | null;
  imageUrls?: string[];
  stock: number;
};

type Review = {
  id: string;
  authorName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="text-amber-500" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(rating)}
      <span className="text-slate-300">{"★".repeat(5 - rating)}</span>
    </span>
  );
}

function StarRatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  return (
    <div
      className="flex items-center gap-0.5"
      role="radiogroup"
      aria-label="Your rating"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
          onClick={() => onChange(n)}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(null)}
          className={`rounded p-0.5 text-3xl leading-none transition-colors ${
            n <= display ? "text-amber-500" : "text-slate-300"
          } hover:text-amber-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1`}
        >
          ★
        </button>
      ))}
      <span className="ml-2 text-sm text-slate-500">{value} / 5</span>
    </div>
  );
}

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { addItem } = useCart();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [mainIndex, setMainIndex] = useState(0);
  const [reviewForm, setReviewForm] = useState({ authorName: "", rating: 5, comment: "" });
  const [submitting, setSubmitting] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [pRes, rRes] = await Promise.all([
        fetch(`/api/products/${id}`),
        fetch(`/api/products/${id}/reviews`),
      ]);
      if (cancelled) return;
      if (pRes.ok) {
        const p = await pRes.json();
        setProduct(p.error ? null : p);
      } else setProduct(null);
      if (rRes.ok) setReviews(await rRes.json());
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const images =
    product && (product.imageUrls?.length ?? 0) > 0
      ? product.imageUrls!
      : product?.imageUrl
        ? [product.imageUrl]
        : [];
  const mainImg = images[mainIndex] ?? images[0];

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : null;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setReviewMsg(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reviewForm),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReviews((prev) => [data, ...prev]);
      setReviewForm({ authorName: "", rating: 5, comment: "" });
      setReviewMsg({ type: "ok", text: "Thanks for your review!" });
    } catch (err) {
      setReviewMsg({ type: "err", text: err instanceof Error ? err.message : "Failed" });
    }
    setSubmitting(false);
  };

  if (product === undefined) {
    return (
      <div className="flex flex-1 flex-col">
        <ShopNav current="other" />
        <div className="mx-auto flex w-full max-w-6xl px-4 pt-4">
          <PageBack href="/catalog" ariaLabel="Back to catalog" />
        </div>
        <p className="p-8 text-center text-slate-500">Loading…</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-1 flex-col">
        <ShopNav current="other" />
        <div className="mx-auto flex w-full max-w-6xl items-center gap-1 px-4 py-4">
          <PageBack href="/catalog" ariaLabel="Back to catalog" />
        </div>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-16 text-center">
          <p className="text-slate-600">Product not found.</p>
          <Link href="/" className="mt-4 inline-block text-primary-600 hover:underline">
            Back to home
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <ShopNav current="other" />
      <div className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 py-3 text-sm text-slate-600">
        <PageBack href="/catalog" ariaLabel="Back to catalog" />
        <span className="text-slate-400">·</span>
        <Link href="/" className="text-primary-600 hover:underline">
          Home
        </Link>
        <span className="text-slate-400">/</span>
        <Link href="/catalog" className="text-primary-600 hover:underline">
          Catalog
        </Link>
      </div>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <div className="relative aspect-square overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
              {mainImg ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mainImg} alt={product.name} className="h-full w-full object-contain" />
              ) : (
                <div className="flex h-full items-center justify-center text-6xl text-slate-300">—</div>
              )}
              {product.stock <= 0 && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50">
                  <span className="rounded bg-slate-800 px-4 py-2 font-medium text-white">
                    Out of Stock
                  </span>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {images.map((url, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setMainIndex(i)}
                    className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                      i === mainIndex ? "border-primary-600" : "border-slate-200 opacity-80 hover:opacity-100"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            {product.category && (
              <span className="text-sm font-medium uppercase tracking-wide text-primary-600">
                {product.category}
              </span>
            )}
            <h1 className="mt-1 text-3xl font-bold text-slate-900">{product.name}</h1>
            {avgRating != null && (
              <p className="mt-2 text-sm text-slate-600">
                <Stars rating={Math.round(avgRating)} />{" "}
                <span className="text-slate-500">
                  {avgRating.toFixed(1)} ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
                </span>
              </p>
            )}
            <p className="mt-4 text-3xl font-bold text-primary-600">{formatMoney(product.price)}</p>
            <p className="mt-2 text-sm text-slate-500">{product.stock} in stock</p>

            <div className="mt-6">
              <h2 className="text-lg font-semibold text-slate-900">Description</h2>
              <p className="mt-2 whitespace-pre-wrap text-slate-600">
                {product.description?.trim() || "No description provided."}
              </p>
            </div>

            <button
              type="button"
              disabled={product.stock <= 0}
              onClick={() =>
                addItem({
                  productId: product.id,
                  name: product.name,
                  price: product.price,
                  imageUrl: images[0] ?? null,
                })
              }
              className="mt-8 w-full rounded-xl bg-primary-600 py-3 text-lg font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-12"
            >
              Add to Cart
            </button>
          </div>
        </div>

        <section className="mt-16 border-t border-slate-200 pt-12">
          <h2 className="text-2xl font-bold text-slate-900">Reviews</h2>

          <form onSubmit={handleReviewSubmit} className="mt-6 max-w-xl rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900">Write a review</h3>
            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Your name (optional)</label>
                <input
                  type="text"
                  value={reviewForm.authorName}
                  onChange={(e) => setReviewForm((f) => ({ ...f, authorName: e.target.value }))}
                  placeholder="e.g. Alex"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium">Rating</label>
                <StarRatingInput
                  value={reviewForm.rating}
                  onChange={(rating) => setReviewForm((f) => ({ ...f, rating }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Comment (optional)</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  placeholder="Share your experience…"
                />
              </div>
            </div>
            {reviewMsg && (
              <p className={`mt-3 text-sm ${reviewMsg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
                {reviewMsg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="mt-4 rounded-lg bg-slate-800 px-4 py-2 font-medium text-white hover:bg-slate-900 disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit review"}
            </button>
          </form>

          <ul className="mt-10 space-y-6">
            {reviews.length === 0 ? (
              <p className="text-slate-500">No reviews yet. Be the first!</p>
            ) : (
              reviews.map((r) => (
                <li key={r.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-slate-900">{r.authorName}</span>
                    <Stars rating={r.rating} />
                    <span className="text-xs text-slate-400">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {r.comment && <p className="mt-2 text-slate-600">{r.comment}</p>}
                </li>
              ))
            )}
          </ul>
        </section>
      </main>
    </div>
  );
}
