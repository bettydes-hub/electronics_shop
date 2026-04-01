"use client";

import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/context/CartContext";
import { PageBack } from "@/components/ui/PageBack";
import { formatMoney } from "@/lib/format-money";

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart } = useCart();

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <nav className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
            <div className="flex items-center gap-1">
              <PageBack href="/catalog" ariaLabel="Back to catalog" />
              <Link href="/catalog" className="text-xl font-bold text-primary-600">
                Electronics Shop
              </Link>
            </div>
            <Link href="/catalog" className="rounded-lg px-4 py-2 font-medium text-slate-600 hover:bg-slate-100">
              Catalog
            </Link>
          </div>
        </nav>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-16 text-center">
          <h1 className="mb-4 text-2xl font-bold text-slate-900">Your cart is empty</h1>
          <p className="mb-6 text-slate-600">Add some products from our catalog.</p>
          <Link
            href="/catalog"
            className="inline-block rounded-lg bg-primary-600 px-6 py-3 font-medium text-white hover:bg-primary-700"
          >
            Browse Catalog
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-1">
            <PageBack href="/catalog" ariaLabel="Back to catalog" />
            <Link href="/catalog" className="text-xl font-bold text-primary-600">
              Electronics Shop
            </Link>
          </div>
          <Link href="/catalog" className="rounded-lg px-4 py-2 font-medium text-slate-600 hover:bg-slate-100">
            Catalog
          </Link>
        </div>
      </nav>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900">Your Cart</h1>
          <button
            type="button"
            onClick={clearCart}
            className="text-sm font-medium text-red-600 hover:text-red-700"
          >
            Clear cart
          </button>
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <div
              key={item.productId}
              className="flex gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                {item.imageUrl ? (
                  <Image
                    src={item.imageUrl}
                    alt={item.name}
                    width={80}
                    height={80}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-2xl text-slate-300">—</div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-slate-900">{item.name}</h2>
                <p className="text-sm text-slate-500">{formatMoney(item.price)} each</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                    className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-medium">{item.quantity}</span>
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                    className="flex h-8 w-8 items-center justify-center rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    className="ml-2 text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">
                  {formatMoney(item.price * item.quantity)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
