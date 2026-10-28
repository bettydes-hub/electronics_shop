"use client";

import { motion } from "framer-motion";
import Link from "next/link";

type RoleKey = "owner" | "seller" | "admin" | "staff";

const cfg: Record<
  RoleKey,
  { gradient: string; glow: string; emoji: string; title: string; subtitle: string }
> = {
  owner: {
    gradient: "from-emerald-600 via-teal-600 to-cyan-700",
    glow: "shadow-emerald-500/25",
    emoji: "📊",
    title: "Owner dashboard",
    subtitle: "Purchases, expenses, profit, products, and orders in one place.",
  },
  seller: {
    gradient: "from-violet-600 via-purple-600 to-fuchsia-700",
    glow: "shadow-violet-500/25",
    emoji: "🛍️",
    title: "Seller workspace",
    subtitle: "Record sales and keep inventory accurate in real time.",
  },
  admin: {
    gradient: "from-slate-700 via-slate-800 to-zinc-900",
    glow: "shadow-slate-500/20",
    emoji: "⚙️",
    title: "Admin control",
    subtitle: "Categories, store settings, staff, and full product management.",
  },
  staff: {
    gradient: "from-indigo-600 via-blue-600 to-sky-700",
    glow: "shadow-indigo-500/25",
    emoji: "🔐",
    title: "Staff sign-in",
    subtitle: "Use your shop username and password.",
  },
};

export function RoleDashboardHero({
  role,
  breadcrumbs,
}: {
  role: RoleKey;
  breadcrumbs?: { href: string; label: string }[];
}) {
  const c = cfg[role];

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={
        "relative overflow-hidden bg-gradient-to-br px-4 py-10 text-white shadow-lg sm:py-12 " +
        c.gradient +
        " " +
        c.glow
      }
    >
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute -left-20 top-0 h-64 w-64 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute -right-10 bottom-0 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
      </div>
      <div className="relative mx-auto max-w-6xl">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="mb-4 flex flex-wrap gap-2 text-sm text-white/80">
            {breadcrumbs.map((b, i) => (
              <span key={b.href} className="flex items-center gap-2">
                {i > 0 && <span className="text-white/40">/</span>}
                <Link href={b.href} className="hover:text-white hover:underline">
                  {b.label}
                </Link>
              </span>
            ))}
          </nav>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <motion.span
              className="text-4xl sm:text-5xl"
              animate={{ y: [0, -4, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              {c.emoji}
            </motion.span>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{c.title}</h1>
            <p className="mt-2 max-w-xl text-sm text-white/85 sm:text-base">{c.subtitle}</p>
          </div>
          <Link
            href="/catalog"
            className="shrink-0 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-center text-sm font-medium backdrop-blur transition hover:bg-white/20"
          >
            Store
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
