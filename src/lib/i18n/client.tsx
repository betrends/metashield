"use client";

import { createContext, useContext, useMemo } from "react";
import { defaultLocale, type Locale } from "./config";
import { createT, type T } from "./translate";

const LocaleContext = createContext<Locale>(defaultLocale);

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

// For client components: `const t = useT();`
export function useT(): T {
  const locale = useLocale();
  return useMemo(() => createT(locale), [locale]);
}
