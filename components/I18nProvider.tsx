"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { makeI18n, type Lang } from "@/lib/i18n";

const Ctx = createContext<Lang>("sv");

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}

/** Text och datum på valt språk i klientkomponenter. */
export function useI18n() {
  const lang = useContext(Ctx);
  return useMemo(() => makeI18n(lang), [lang]);
}
