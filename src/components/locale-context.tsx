"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import { useRouter } from "next/navigation";
import trLocale from "@/locales/tr.json";
import enLocale from "@/locales/en.json";

export type Locale = "tr" | "en";
type Dictionary = typeof trLocale;

const dictionaries: Record<Locale, Dictionary> = {
  tr: trLocale,
  en: enLocale,
};

interface LocaleContextType {
  locale: Locale;
  dictionary: Dictionary;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

interface LocaleProviderProps {
  children: ReactNode;
  initialLocale: Locale;
  initialDictionary: Dictionary;
}

export function LocaleProvider({
  children,
  initialLocale,
  initialDictionary,
}: LocaleProviderProps) {
  const router = useRouter();
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const [dictionary, setDictionary] = useState<Dictionary>(initialDictionary);

  const setLocale = useCallback(
    (newLocale: Locale) => {
      // Update state for immediate UI update (navbar)
      setLocaleState(newLocale);
      setDictionary(dictionaries[newLocale]);

      // Save to cookie for persistence
      document.cookie = `locale=${newLocale};path=/;max-age=31536000`;

      // Refresh server components to update page content
      router.refresh();
    },
    [router],
  );

  // Sync with initial locale from server on mount
  useEffect(() => {
    setLocaleState(initialLocale);
    setDictionary(initialDictionary);
  }, [initialLocale, initialDictionary]);

  return (
    <LocaleContext.Provider value={{ locale, dictionary, setLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error("useLocale must be used within a LocaleProvider");
  }
  return context;
}
