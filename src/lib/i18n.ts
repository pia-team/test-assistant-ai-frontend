"use server";

import { cookies } from "next/headers";

export type Locale = "tr" | "en";

export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  return (cookieStore.get("locale")?.value as Locale) || "tr";
}

export async function setLocale(locale: Locale) {
  const cookieStore = await cookies();
  cookieStore.set("locale", locale, {
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });
}

export async function getDictionary(locale: Locale) {
  return import(`@/locales/${locale}.json`).then((m) => m.default);
}
