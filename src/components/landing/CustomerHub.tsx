"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { PageBack } from "@/components/ui/PageBack";
import { ShopCustomerFooter } from "@/components/landing/ShopCustomerFooter";

export function CustomerHub() {
  const reduce = useReducedMotion();
  const { totalItems } = useCart();

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {!reduce && (
          <>
            <motion.div
              className="absolute -left-20 top-20 h-72 w-72 rounded-full bg-fuchsia-500/30 blur-[80px]"
              animate={{ x: [0, 40, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -right-16 top-40 h-96 w-96 rounded-full bg-cyan-500/25 blur-[90px]"
              animate={{ x: [0, -30, 0], y: [0, 50, 0] }}
              transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute bottom-20 left-1/4 h-64 w-64 rounded-full bg-violet-500/20 blur-[70px]"
              animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )}
        {reduce && (
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-900/20 via-transparent to-cyan-900/20" />
        )}
      </div>

      <nav className="relative z-20 border-b border-white/10 bg-black/20 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-1">
            <PageBack href="/" theme="dark" ariaLabel="Back to store" />
            <Link href="/" className="text-lg font-bold text-white">
              Store
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-sky-200 sm:inline">
              /customer
            </span>
            <Link
              href="/cart"
              className="relative rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Cart
              {totalItems > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-fuchsia-500 px-1 text-xs font-bold text-white">
                  {totalItems}
                </span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-4 pb-10 pt-6 sm:pt-8">
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={reduce ? false : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="rounded-3xl border border-white/15 bg-white/[0.97] p-5 shadow-2xl shadow-black/20 backdrop-blur-md sm:p-8"
        >
          <ProductGrid title="All products" />
        </motion.div>
      </main>
      <ShopCustomerFooter />
    </div>
  );
}
