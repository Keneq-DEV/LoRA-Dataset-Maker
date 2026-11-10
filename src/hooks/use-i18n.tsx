"use client";

import * as React from "react";
import {
  type Lang,
  type TranslationKey,
  t as translate,
  getStoredLang,
  setStoredLang,
} from "@/lib/i18n";

interface I18nContextValue {
  lang: Lang;
  isReady: boolean;
  needsSelection: boolean; // true on first run (no language chosen yet)
  setLang: (l: Lang) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const I18nContext = React.createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // null during SSR / before mount; Lang once loaded from localStorage.
  const [lang, setLang] = React.useState<Lang | null>(null);
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    const stored = getStoredLang();
    setLang(stored); // null if not set → triggers first-run picker
    setIsReady(true);
  }, []);

  const setAndSave = React.useCallback((l: Lang) => {
    setStoredLang(l);
    setLang(l);
  }, []);

  // Use English as fallback during SSR / before ready, so the UI doesn't flash
  // raw keys. The actual chosen language is used once ready.
  const effectiveLang = lang ?? "en";
  const needsSelection = isReady && lang === null;

  const tFn = React.useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(effectiveLang, key, params),
    [effectiveLang],
  );

  const value: I18nContextValue = {
    lang: effectiveLang,
    isReady,
    needsSelection,
    setLang: setAndSave,
    t: tFn,
  };

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = React.useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}
