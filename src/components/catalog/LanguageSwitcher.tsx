"use client";

import { useShopLocale } from "@/context/LocaleContext";
import type { ShopLocale } from "@/lib/shop-messages";

export function LanguageSwitcher({ theme = "light" }: { theme?: "light" | "dark" }) {
  const { locale, setLocale, t } = useShopLocale();
  const dark = theme === "dark";

  const btn = (code: ShopLocale, label: string) => (
    <button
      type="button"
      onClick={() => setLocale(code)}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
        locale === code
          ? dark
            ? "bg-white text-primary-700"
            : "bg-primary-600 text-white"
          : dark
            ? "text-emerald-100 hover:bg-primary-600/70 hover:text-white"
            : "text-slate-600 hover:bg-slate-100"
      }`}
      aria-pressed={locale === code}
    >
      {label}
    </button>
  );

  return (
    <div
      className={`flex items-center gap-1 rounded-full border p-0.5 ${
        dark ? "border-emerald-200/40 bg-primary-600/50" : "border-slate-200 bg-slate-100"
      }`}
      role="group"
      aria-label="Language"
    >
      {btn("en", `🇺🇸 ${t("langEnglish")}`)}
      {btn("am", `🇪🇹 ${t("langAmharic")}`)}
    </div>
  );
}
