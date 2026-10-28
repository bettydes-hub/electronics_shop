"use client";

import type { ReactNode } from "react";
import { LocaleProvider } from "@/context/LocaleContext";

export function AppProviders({ children }: { children: ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
