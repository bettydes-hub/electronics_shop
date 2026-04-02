"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  LOCALE_STORAGE_KEY,
  shopMessages,
  type ShopLocale,
  type ShopMessageKey,
} from "@/lib/shop-messages";

type LocaleContextValue = {
  locale: ShopLocale;
  setLocale: (l: ShopLocale) => void;
  t: (key: ShopMessageKey) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<ShopLocale>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(LOCALE_STORAGE_KEY);
      if (s === "am" || s === "en") setLocaleState(s);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const setLocale = useCallback((l: ShopLocale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    if (typeof document !== "undefined") {
      document.documentElement.lang = l === "am" ? "am" : "en";
    }
  }, []);

  useEffect(() => {
    if (!ready || typeof document === "undefined") return;
    document.documentElement.lang = locale === "am" ? "am" : "en";
  }, [locale, ready]);

  const t = useCallback(
    (key: ShopMessageKey) => {
      const pack = shopMessages[locale];
      const v = pack[key] as string;
      if (v) return v;
      const en = shopMessages.en[key] as string;
      return en || String(key);
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useShopLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useShopLocale must be used within LocaleProvider");
  }
  return ctx;
}

/** Safe for components that may render outside shop (returns English-only fallback). */
export function useShopLocaleOptional(): LocaleContextValue | null {
  return useContext(LocaleContext);
}
