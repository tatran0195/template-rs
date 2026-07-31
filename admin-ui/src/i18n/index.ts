import { useLocaleStore, type Locale } from "@/stores/locale";
import { en } from "./en";
import { zh } from "./zh";
import { ja } from "./ja";

const dicts: Partial<Record<Locale, Record<string, string>>> = { en, zh, ja };

export function translate(locale: Locale, key: string, vars?: Record<string, string | number>): string {
  let s = dicts[locale]?.[key] ?? en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  }
  return s;
}

/** Mirrors the recovered `useTranslation`-style hook. */
export function useT() {
  const locale = useLocaleStore((s) => s.locale);
  return {
    t: (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    locale,
  };
}
