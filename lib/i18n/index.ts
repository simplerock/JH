import type { Recurrence } from "../types.ts";
import { en } from "./en.ts";

// Svenska är grundspråket och står direkt i koden. Engelskan slås upp med den svenska texten som nyckel.
// Saknas en översättning visas svenskan. lib/i18n/i18n.test.ts kollar att inget saknas.

export type Lang = "sv" | "en";
export const LANGS: Lang[] = ["sv", "en"];
export type Vars = Record<string, string | number>;
export type T = (text: string, vars?: Vars) => string;

const LOCALE: Record<Lang, string> = { sv: "sv-SE", en: "en-GB" };

export function translate(lang: Lang, text: string, vars?: Vars): string {
  const out = lang === "en" ? (en[text] ?? text) : text;
  return vars ? out.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : out;
}

const parse = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

const RECURRENCE: Record<Recurrence, string> = { daily: "Varje dag", weekly: "Varje vecka", monthly: "Varje månad", none: "En gång" };

/** Allt som behövs för att visa text och datum på rätt språk. */
export function makeI18n(lang: Lang) {
  const locale = LOCALE[lang];
  const t: T = (text, vars) => translate(lang, text, vars);
  const date = (iso: string) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", timeZone: "UTC" }).format(parse(iso));
  return {
    lang,
    locale,
    t,
    date,
    range: (start: string, end: string | null) => (!end || end === start ? date(start) : `${date(start)} – ${date(end)}`),
    month: (month: string) => {
      const [y, m] = month.split("-").map(Number);
      return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
    },
    recurrence: (r: Recurrence) => t(RECURRENCE[r]),
    /** Tidpunkt i svensk tid, t.ex. "sön 22:54". */
    time: (instant: string, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { ...opts, timeZone: "Europe/Stockholm" }).format(new Date(instant)),
    number: (n: number) => new Intl.NumberFormat(locale).format(n),
  };
}

export type I18n = ReturnType<typeof makeI18n>;
export const isLang = (v: unknown): v is Lang => v === "sv" || v === "en";
