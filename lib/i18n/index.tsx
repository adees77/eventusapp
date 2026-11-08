"use client";

/**
 * Minimal i18n. To add a language (ky, uz, tg):
 *  1. add messages/<code>.json with the same keys,
 *  2. register it in DICTIONARIES, LOCALES and DATE_LOCALES below,
 *  3. add the field to LText in lib/data/types.ts (seed texts).
 *
 * Plurals: "one|few|many" for Russian, "one|other" for English, picked by
 * Intl.PluralRules. Use `tn(key, n)`.
 */
import { format as formatDate, parseISO, type Locale as DateLocale } from "date-fns";
import { enUS, ru as ruDate } from "date-fns/locale";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import en from "@/messages/en.json";
import ru from "@/messages/ru.json";
import type { LText, Locale } from "@/lib/data/types";

export const LOCALES: Locale[] = ["ru", "en"];
export const DEFAULT_LOCALE: Locale = "ru";
export const LOCALE_COOKIE = "eventus-locale";

const DICTIONARIES: Record<Locale, typeof ru> = { ru, en };
export const DATE_LOCALES: Record<Locale, DateLocale> = { ru: ruDate, en: enUS };
const PLURAL_ORDER: Record<Locale, Intl.LDMLPluralRule[]> = {
  ru: ["one", "few", "many"],
  en: ["one", "other"],
};

type Dict = typeof ru;
type Join<K, P> = K extends string ? (P extends string ? `${K}.${P}` : never) : never;
type Paths<T> = {
  [K in keyof T]: T[K] extends string ? K : T[K] extends readonly unknown[] ? never : Join<K, Paths<T[K]>>;
}[keyof T];
type ListPaths<T> = {
  [K in keyof T]: T[K] extends readonly string[] ? K : T[K] extends string ? never : Join<K, ListPaths<T[K]>>;
}[keyof T];
export type MessageKey = Paths<Dict>;
export type ListKey = ListPaths<Dict>;
type Vars = Record<string, string | number>;

function lookup(dict: Dict, key: string): unknown {
  return key.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown> | undefined)?.[k], dict);
}

function interpolate(s: string, vars?: Vars) {
  if (!vars) return s;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

export function translate(locale: Locale, key: MessageKey, vars?: Vars): string {
  const raw = (lookup(DICTIONARIES[locale], key) ?? lookup(DICTIONARIES[DEFAULT_LOCALE], key) ?? key) as string;
  return interpolate(raw, vars);
}

export function translatePlural(locale: Locale, key: MessageKey, n: number, vars?: Vars): string {
  const forms = translate(locale, key).split("|");
  const rule = new Intl.PluralRules(locale).select(n);
  const idx = Math.max(0, PLURAL_ORDER[locale].indexOf(rule));
  const form = forms[Math.min(idx === -1 ? forms.length - 1 : idx, forms.length - 1)] ?? forms[forms.length - 1];
  return interpolate(form, { n, ...vars });
}

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: MessageKey, vars?: Vars) => string;
  tn: (key: MessageKey, n: number, vars?: Vars) => string;
  list: (key: ListKey) => string[];
  /** pick a localized seed text */
  l: (text: LText | undefined) => string;
  /** format money in som, tabular */
  money: (n: number) => string;
  num: (n: number) => string;
  /** format an ISO date (yyyy-MM-dd) with a date-fns pattern */
  date: (iso: string, pattern?: string) => string;
}

const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    document.documentElement.lang = l;
  }, []);

  const value = useMemo<I18nCtx>(() => {
    const nf = new Intl.NumberFormat(locale === "ru" ? "ru-RU" : "en-US");
    return {
      locale,
      setLocale,
      t: (key, vars) => translate(locale, key, vars),
      tn: (key, n, vars) => translatePlural(locale, key, n, vars),
      list: (key) => (lookup(DICTIONARIES[locale], key) as string[]) ?? [],
      l: (text) => (text ? (text[locale] ?? text.ru) : ""),
      money: (n) => `${nf.format(n)} ${translate(locale, "common.som")}`,
      num: (n) => nf.format(n),
      date: (iso, pattern = "d MMMM") => formatDate(parseISO(iso), pattern, { locale: DATE_LOCALES[locale] }),
    };
  }, [locale, setLocale]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

export const useT = () => useI18n().t;
