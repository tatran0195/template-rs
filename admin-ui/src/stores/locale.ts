import { create } from "zustand";
import { persist } from "zustand/middleware";

export const LOCALES = [
  { value: "en", label: "English" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "ar", label: "العربية" },
] as const;

export type Locale = (typeof LOCALES)[number]["value"];

interface LocaleState {
  locale: Locale;
  setLocale: (l: Locale) => void;
}

/** Mirrors the recovered `i18n-locale` store. */
export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "en",
      setLocale: (locale) => set({ locale }),
    }),
    { name: "i18n-locale" },
  ),
);
