// Languages the public site is available in. English text in the code is
// the source of truth; French lives in ./fr/*.ts as English → French maps.
export const locales = ["en", "fr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

// Cookie that remembers the visitor's choice from the nav-bar toggle.
export const LOCALE_COOKIE = "lang";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
