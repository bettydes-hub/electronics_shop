"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useShopLocale } from "@/context/LocaleContext";

type Variant = "light" | "dark";

type Props = {
  variant?: Variant;
  className?: string;
};

/**
 * Shows when the DB has zero users — typical right after deploy. Points admins to /setup.
 */
export function FirstSetupBanner({ variant = "light", className = "" }: Props) {
  const { t } = useShopLocale();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/auth/bootstrap");
        const data = await res.json();
        if (!cancelled) setNeedsSetup(data.needsSetup === true);
      } catch {
        if (!cancelled) setNeedsSetup(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (needsSetup !== true) return null;

  const isDark = variant === "dark";

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm leading-relaxed ${
        isDark
          ? "border-amber-400/40 bg-amber-500/15 text-amber-50"
          : "border-primary-200 bg-primary-50 text-slate-900"
      } ${className}`}
    >
      <p className={`font-medium ${isDark ? "text-amber-100" : "text-primary-900"}`}>
        {t("firstSetupNoAdmin")}
      </p>
      <p className="mt-3">
        <Link
          href="/setup"
          className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-semibold transition ${
            isDark
              ? "bg-amber-400 text-slate-900 hover:bg-amber-300"
              : "bg-primary-600 text-white hover:bg-primary-700"
          }`}
        >
          {t("firstSetupCta")}
        </Link>
      </p>
    </div>
  );
}
