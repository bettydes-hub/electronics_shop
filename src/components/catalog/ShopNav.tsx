"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";

type Theme = "light" | "dark";

export function ShopNav({
  current,
  theme = "light",
}: {
  current?: "home" | "catalog" | "other";
  theme?: Theme;
}) {
  const { totalItems } = useCart();
  const dark = theme === "dark";

  return (
    <nav
      className={
        dark
          ? "border-b border-zinc-800 bg-black"
          : "border-b border-slate-200 bg-white"
      }
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/"
            className={`text-xl font-bold transition-colors ${
              dark ? "text-white hover:text-primary-400" : "text-primary-600 hover:text-primary-700"
            }`}
          >
            Electronics Shop
          </Link>
          <div className={`flex items-center gap-1 text-sm font-medium ${dark ? "text-zinc-300" : ""}`}>
            <Link
              href="/"
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                dark
                  ? current === "home"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                  : current === "home"
                    ? "bg-primary-50 text-primary-700"
                    : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Home
            </Link>
            <Link
              href="/catalog"
              className={`rounded-lg px-3 py-1.5 transition-colors ${
                dark
                  ? current === "catalog"
                    ? "bg-zinc-800 text-white"
                    : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                  : current === "catalog"
                    ? "bg-primary-50 text-primary-700"
                    : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              All products
            </Link>
          </div>
        </div>
        <Link
          href="/cart"
          className={`relative inline-flex items-center gap-2 rounded-lg px-4 py-2 font-medium transition-colors ${
            dark
              ? "text-zinc-200 hover:bg-zinc-900 hover:text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Cart
          {totalItems > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary-500 text-xs font-bold text-white">
              {totalItems}
            </span>
          )}
        </Link>
      </div>
    </nav>
  );
}
